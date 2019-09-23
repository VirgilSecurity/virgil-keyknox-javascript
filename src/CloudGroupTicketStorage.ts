import {
  KeyknoxClientError,
  GroupSessionMessageInfoAlreadyExistsError,
  GroupSessionDoesntExistError,
} from './errors';
import { KeyknoxCrypto } from './KeyknoxCrypto';
import { KeyknoxManager } from './KeyknoxManager';
import {
  ICrypto,
  IPrivateKey,
  IPublicKey,
  IGroupSessionMessageInfo,
  IAccessTokenProvider,
  ICard,
  Ticket,
} from './types';

export class CloudGroupTicketStorage {
  static readonly DEFAULT_ROOT = 'group-sessions';

  private readonly keyknoxManager: KeyknoxManager;
  private readonly identity: string;
  private readonly privateKey: IPrivateKey;
  private readonly publicKey: IPublicKey;
  private readonly root: string;

  constructor(options: {
    keyknoxManager: KeyknoxManager;
    identity: string;
    privateKey: IPrivateKey;
    publicKey: IPublicKey;
    root?: string;
  }) {
    const { keyknoxManager, identity, privateKey, publicKey, root } = options;
    this.keyknoxManager = keyknoxManager;
    this.identity = identity;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.root = root || CloudGroupTicketStorage.DEFAULT_ROOT;
  }

  static create(options: {
    accessTokenProvider: IAccessTokenProvider;
    identity: string;
    privateKey: IPrivateKey;
    publicKey: IPublicKey;
    virgilCrypto: ICrypto;
    root?: string;
  }) {
    const { accessTokenProvider, identity, privateKey, publicKey, virgilCrypto, root } = options;
    const keyknoxManager = KeyknoxManager.create(
      accessTokenProvider,
      new KeyknoxCrypto(virgilCrypto),
    );
    return new CloudGroupTicketStorage({
      keyknoxManager,
      identity,
      privateKey,
      publicKey,
      root,
    });
  }

  async store(groupSessionMessageInfo: IGroupSessionMessageInfo): Promise<void>;
  async store(groupSessionMessageInfo: IGroupSessionMessageInfo, card: ICard): Promise<void>;
  async store(groupSessionMessageInfo: IGroupSessionMessageInfo, cards: ICard[]): Promise<void>;
  async store(groupSessionMessageInfo: IGroupSessionMessageInfo, cards?: ICard | ICard[]) {
    const { epochNumber, sessionId, data } = groupSessionMessageInfo;
    let identities = [this.identity];
    let publicKeys = [this.publicKey];
    if (cards) {
      const myCards = Array.isArray(cards) ? cards : [cards];
      identities = identities.concat(myCards.map(card => card.identity));
      publicKeys = publicKeys.concat(myCards.map(card => card.publicKey));
    }
    try {
      await this.keyknoxManager.v2Push({
        identities,
        publicKeys,
        privateKey: this.privateKey,
        root: this.root,
        path: sessionId,
        key: epochNumber.toString(),
        value: data.toString('base64'),
      });
    } catch (error) {
      // 50010 - `Virgil-Keyknox-Previous-Hash` header is invalid.
      if (error instanceof KeyknoxClientError && error.code === 50010) {
        throw new GroupSessionMessageInfoAlreadyExistsError();
      }
      throw error;
    }
  }

  async retrieve(sessionId: string): Promise<Ticket[]>;
  async retrieve(sessionId: string, identity: string, publicKey: IPublicKey): Promise<Ticket[]>;
  async retrieve(sessionId: string, identity?: string, publicKey?: IPublicKey) {
    let myIdentity = this.identity;
    let myPublicKey = this.publicKey;
    if (identity && publicKey) {
      myIdentity = identity;
      myPublicKey = publicKey;
      !identity;
    } else if ((identity && !publicKey) || (!identity && publicKey)) {
      throw new Error("You need to provide both 'identity' and 'publicKey'");
    }
    const epochNumbers = await this.keyknoxManager.v2GetKeys({
      root: this.root,
      path: sessionId,
      identity: myIdentity,
    });
    if (!epochNumbers.length) {
      throw new GroupSessionDoesntExistError();
    }
    const pullRequests = epochNumbers.map(epochNumber =>
      this.keyknoxManager.v2Pull({
        root: this.root,
        path: sessionId,
        key: epochNumber,
        identity: myIdentity,
        privateKey: this.privateKey,
        publicKeys: myPublicKey,
      }),
    );
    const decryptedKeyknoxValues = await Promise.all(pullRequests);
    const tickets: Ticket[] = decryptedKeyknoxValues.map(({ key, path, identities, value }) => ({
      identities,
      groupSessionMessageInfo: {
        sessionId: path,
        epochNumber: +key,
        data: value,
      },
    }));
    return tickets;
  }

  async addRecipients(sessionId: string, cards: ICard[]) {
    const epochNumbers = await this.keyknoxManager.v2GetKeys({
      root: this.root,
      path: sessionId,
      identity: this.identity,
    });
    for (const epochNumber of epochNumbers) {
      const decryptedKeyknoxValue = await this.keyknoxManager.v2Pull({
        root: this.root,
        path: sessionId,
        key: epochNumber,
        identity: this.identity,
        privateKey: this.privateKey,
        publicKeys: this.publicKey,
      });
      await this.keyknoxManager.v2Push({
        ...decryptedKeyknoxValue,
        identities: cards.map(card => card.identity),
        publicKeys: [this.publicKey, ...cards.map(card => card.publicKey)],
        privateKey: this.privateKey,
      });
    }
  }

  async addRecipient(sessionId: string, card: ICard) {
    return this.addRecipients(sessionId, [card]);
  }

  async reAddRecipient(sessionId: string, card: ICard) {
    const epochNumbers = await this.keyknoxManager.v2GetKeys({
      root: this.root,
      path: sessionId,
      identity: this.identity,
    });
    for (const epochNumber of epochNumbers) {
      const decryptedKeyknoxValue = await this.keyknoxManager.v2Pull({
        root: this.root,
        path: sessionId,
        key: epochNumber,
        identity: this.identity,
        privateKey: this.privateKey,
        publicKeys: this.publicKey,
      });
      await this.removeRecipient(sessionId, card.identity, +epochNumber);
      await this.keyknoxManager.v2Push({
        root: this.root,
        path: sessionId,
        key: epochNumber,
        identities: [card.identity],
        value: decryptedKeyknoxValue.value,
        privateKey: this.privateKey,
        publicKeys: [this.publicKey, card.publicKey],
        keyknoxHash: decryptedKeyknoxValue.keyknoxHash,
      });
    }
  }

  async removeRecipient(sessionId: string, identity: string, epochNumber?: number) {
    await this.keyknoxManager.v2Reset({
      identity,
      root: this.root,
      path: sessionId,
      key: typeof epochNumber === 'number' ? epochNumber.toString() : undefined,
    });
  }

  async delete(sessionId: string) {
    return this.keyknoxManager.v2Reset({ root: this.root, path: sessionId });
  }
}

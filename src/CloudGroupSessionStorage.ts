import { KeyknoxCrypto } from './KeyknoxCrypto';
import { KeyknoxManager } from './KeyknoxManager';
import {
  ICrypto,
  IPrivateKey,
  IPublicKey,
  IGroupSessionMessageInfo,
  IGroupSession,
  IAccessTokenProvider,
  ICard,
} from './types';

export class CloudGroupSessionStorage {
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
    this.root = root || CloudGroupSessionStorage.DEFAULT_ROOT;
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
    return new CloudGroupSessionStorage({
      keyknoxManager,
      identity,
      privateKey,
      publicKey,
      root,
    });
  }

  async store(groupSessionMessageInfo: IGroupSessionMessageInfo): Promise<void>;
  async store(groupSessionMessageInfo: IGroupSessionMessageInfo, cards: ICard[]): Promise<void>;
  async store(groupSessionMessageInfo: IGroupSessionMessageInfo, cards?: ICard[]) {
    const { epochNumber, sessionId, data } = groupSessionMessageInfo;
    let identities = [this.identity];
    let publicKeys = [this.publicKey];
    if (cards) {
      identities = identities.concat(cards.map(card => card.identity));
      publicKeys = publicKeys.concat(cards.map(card => card.publicKey));
    }
    await this.keyknoxManager.v2Push({
      identities,
      publicKeys,
      privateKey: this.privateKey,
      root: this.root,
      path: sessionId,
      key: epochNumber.toString(),
      value: data.toString('base64'),
    });
  }

  async retrieve(sessionId: string): Promise<IGroupSession>;
  async retrieve(
    sessionId: string,
    identity: string,
    publicKey: IPublicKey,
  ): Promise<IGroupSession>;
  async retrieve(sessionId: string, identity?: string, publicKey?: IPublicKey) {
    let myIdentity = this.identity;
    let myPublicKey = this.publicKey;
    if (identity && publicKey) {
      myIdentity = identity;
      myPublicKey = publicKey;
    } else if (!publicKey) {
      throw new Error("You need to provide both 'identity' and 'publicKey'");
    }
    const epochs = await this.keyknoxManager.v2GetKeys({
      root: this.root,
      path: sessionId,
      identity: myIdentity,
    });
    const pullRequests = epochs.map(epoch =>
      this.keyknoxManager.v2Pull({
        identity,
        root: this.root,
        path: sessionId,
        key: epoch,
        privateKey: this.privateKey,
        publicKeys: myPublicKey,
      }),
    );
    const decryptedKeyknoxValues = await Promise.all(pullRequests);
    const messages = decryptedKeyknoxValues.map(({ value }) => value);
    return this.keyknoxManager.keyknoxCrypto.importGroupSession(messages);
  }

  async addRecipients(sessionId: string, cards: ICard[]) {
    const identities = [this.identity, ...cards.map(card => card.identity)];
    const publicKeys = [this.publicKey, ...cards.map(card => card.publicKey)];
    const epochs = await this.keyknoxManager.v2GetKeys({
      root: this.root,
      path: sessionId,
      identity: this.identity,
    });
    epochs.forEach(async epoch => {
      const decryptedKeyknoxValue = await this.keyknoxManager.v2Pull({
        root: this.root,
        path: sessionId,
        key: epoch,
        privateKey: this.privateKey,
        publicKeys: publicKeys,
      });
      await this.keyknoxManager.v2Push({
        ...decryptedKeyknoxValue,
        identities,
        publicKeys,
        privateKey: this.privateKey,
      });
    });
  }

  async reAddRecipient(sessionId: string, card: ICard) {
    const epochs = await this.keyknoxManager.v2GetKeys({
      root: this.root,
      path: sessionId,
      identity: this.identity,
    });
    epochs.forEach(async epoch => {
      const decryptedKeyknoxValue = await this.keyknoxManager.v2Pull({
        root: this.root,
        path: sessionId,
        key: epoch,
        identity: this.identity,
        privateKey: this.privateKey,
        publicKeys: this.publicKey,
      });
      await this.removeRecipient(sessionId, card.identity, epoch);
      await this.keyknoxManager.v2Push({
        root: this.root,
        path: sessionId,
        key: epoch,
        identities: [this.identity, card.identity],
        value: decryptedKeyknoxValue.value,
        privateKey: this.privateKey,
        publicKeys: [this.publicKey, card.publicKey],
      });
    });
  }

  async removeRecipient(sessionId: string): Promise<void>;
  async removeRecipient(sessionId: string, identity: string, epoch?: string): Promise<void>;
  async removeRecipient(sessionId: string, identity?: string, epoch?: string) {
    await this.keyknoxManager.v2Reset({
      root: this.root,
      path: sessionId,
      key: epoch,
      identity: identity || this.identity,
    });
  }

  async delete(sessionId: string) {
    return this.keyknoxManager.v2Reset({ root: this.root, path: sessionId });
  }
}

import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto/dist/types/interfaces';
import { IAccessTokenProvider } from 'virgil-sdk/dist/types/Sdk/Web/Auth/AccessTokenProviders';

import IKeyknoxClient from './clients/IKeyknoxClient';
import KeyknoxClient from './clients/KeyknoxClient';
import IKeyknoxCrypto from './cryptos/IKeyknoxCrypto';
import KeyknoxCrypto from './cryptos/KeyknoxCrypto';
import { DecryptedKeyknoxValue } from './entities';

export default class KeyknoxManager {
  private readonly accessTokenProvider: IAccessTokenProvider;

  private privateKey: VirgilPrivateKey;
  private publicKey: VirgilPublicKey | VirgilPublicKey[];

  private readonly keyknoxClient: IKeyknoxClient;
  private readonly keyknoxCrypto: IKeyknoxCrypto;

  constructor(
    accessTokenProvider: IAccessTokenProvider,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
    keyknoxCrypto?: IKeyknoxCrypto,
    keyknoxClient?: IKeyknoxClient,
  ) {
    this.accessTokenProvider = accessTokenProvider;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.keyknoxClient = keyknoxClient || new KeyknoxClient();
    this.keyknoxCrypto = keyknoxCrypto || new KeyknoxCrypto();
  }

  async pushValue(value: Buffer, previousHash?: Buffer): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const dataAndMetadata = this.keyknoxCrypto.encrypt(value, this.privateKey, this.publicKey);
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      dataAndMetadata.metadata,
      dataAndMetadata.encryptedData,
      token.toString(),
      previousHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.privateKey, this.publicKey);
  }

  async pullValue(): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'get' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pullValue(token.toString());
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.privateKey, this.publicKey);
  }

  async updateRecipients(options: {
    newPrivateKey?: VirgilPrivateKey;
    newPublicKey?: VirgilPublicKey | VirgilPublicKey[];
    value?: Buffer;
    previousHash?: Buffer;
  }): Promise<DecryptedKeyknoxValue> {
    if (options.value && options.previousHash) {
      return this.updateRecipientsValues(
        options.value,
        options.previousHash,
        options.newPrivateKey,
        options.newPublicKey,
      );
    }
    if (options.newPrivateKey || options.newPublicKey) {
      return this.updateRecipientsKeys(options.newPrivateKey, options.newPublicKey);
    }
    throw new Error();
  }

  private async updateRecipientsValues(
    value: Buffer,
    previousHash: Buffer,
    newPrivateKey?: VirgilPrivateKey,
    newPublicKey?: VirgilPublicKey | VirgilPublicKey[],
  ): Promise<DecryptedKeyknoxValue> {
    if (!newPrivateKey && !newPublicKey) {
      return this.pushValue(value, previousHash);
    }
    const decrypedKeyknoxValue = await this.pullValue();
    if (newPrivateKey) {
      this.privateKey = newPrivateKey;
    }
    if (newPublicKey) {
      this.publicKey = newPublicKey;
    }
    const dataAndMetadata = this.keyknoxCrypto.encrypt(
      decrypedKeyknoxValue.value,
      this.privateKey,
      this.publicKey,
    );
    const token = await this.accessTokenProvider.getToken({ operation: 'get' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      dataAndMetadata.metadata,
      dataAndMetadata.encryptedData,
      token.toString(),
      decrypedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.privateKey, this.publicKey);
  }

  private async updateRecipientsKeys(
    newPrivateKey?: VirgilPrivateKey,
    newPublicKey?: VirgilPublicKey | VirgilPublicKey[],
  ): Promise<DecryptedKeyknoxValue> {
    const decrypedKeyknoxValue = await this.pullValue();
    if (newPrivateKey) {
      this.privateKey = newPrivateKey;
    }
    if (newPublicKey) {
      this.publicKey = newPublicKey;
    }
    const dataAndMetadata = this.keyknoxCrypto.encrypt(
      decrypedKeyknoxValue.value,
      this.privateKey,
      this.publicKey,
    );
    const token = await this.accessTokenProvider.getToken({ operation: 'get' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      dataAndMetadata.metadata,
      dataAndMetadata.encryptedData,
      token.toString(),
      decrypedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.privateKey, this.publicKey);
  }
}

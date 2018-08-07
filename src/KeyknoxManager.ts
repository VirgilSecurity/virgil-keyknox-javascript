import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto';
import { IAccessTokenProvider } from 'virgil-sdk';

import IKeyknoxClient from './clients/IKeyknoxClient';
import KeyknoxClient from './clients/KeyknoxClient';
import IKeyknoxCrypto from './cryptos/IKeyknoxCrypto';
import KeyknoxCrypto from './cryptos/KeyknoxCrypto';
import { DecryptedKeyknoxValue } from './entities';

export default class KeyknoxManager {
  private readonly accessTokenProvider: IAccessTokenProvider;

  private myPrivateKey: VirgilPrivateKey;
  private myPublicKey: VirgilPublicKey | VirgilPublicKey[];

  private readonly keyknoxClient: IKeyknoxClient;
  private readonly keyknoxCrypto: IKeyknoxCrypto;

  get privateKey(): VirgilPrivateKey {
    return this.myPrivateKey;
  }

  get publicKey(): VirgilPublicKey | VirgilPublicKey[] {
    return this.myPublicKey;
  }

  constructor(
    accessTokenProvider: IAccessTokenProvider,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
    keyknoxClient?: IKeyknoxClient,
    keyknoxCrypto?: IKeyknoxCrypto,
  ) {
    this.accessTokenProvider = accessTokenProvider;
    this.myPrivateKey = privateKey;
    this.myPublicKey = publicKey;
    this.keyknoxClient = keyknoxClient || new KeyknoxClient();
    this.keyknoxCrypto = keyknoxCrypto || new KeyknoxCrypto();
  }

  async pushValue(value: Buffer, previousHash?: Buffer): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      value,
      this.myPrivateKey,
      this.myPublicKey,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      previousHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKey);
  }

  async pullValue(): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'get' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pullValue(token.toString());
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKey);
  }

  async resetValue(): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'delete' });
    return this.keyknoxClient.resetValue(token.toString());
  }

  async updateValue(options: {
    value: Buffer;
    previousHash: Buffer;
    newPrivateKey?: VirgilPrivateKey;
    newPublicKey?: VirgilPublicKey;
    newPublicKeys?: VirgilPublicKey[];
  }): Promise<DecryptedKeyknoxValue> {
    if (!options.newPrivateKey && !options.newPublicKey && !options.newPublicKeys) {
      return this.pushValue(options.value, options.previousHash);
    }
    const decryptedKeyknoxValue = await this.pullValue();
    if (options.newPrivateKey) {
      this.myPrivateKey = options.newPrivateKey;
    }
    const newPublicKey = options.newPublicKey || options.newPublicKeys;
    if (newPublicKey) {
      this.myPublicKey = newPublicKey;
    }
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      decryptedKeyknoxValue.value,
      this.myPrivateKey,
      this.myPublicKey,
    );
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKey);
  }

  async updateRecipients(options: {
    newPrivateKey?: VirgilPrivateKey;
    newPublicKey?: VirgilPublicKey;
    newPublicKeys?: VirgilPublicKey[];
  }): Promise<DecryptedKeyknoxValue> {
    const decryptedKeyknoxValue = await this.pullValue();
    if (!decryptedKeyknoxValue.meta.byteLength && !decryptedKeyknoxValue.value.byteLength) {
      return decryptedKeyknoxValue;
    }
    if (options.newPrivateKey) {
      this.myPrivateKey = options.newPrivateKey;
    }
    const newPublicKey = options.newPublicKey || options.newPublicKeys;
    if (newPublicKey) {
      this.myPublicKey = newPublicKey;
    }
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      decryptedKeyknoxValue.value,
      this.myPrivateKey,
      this.myPublicKey,
    );
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKey);
  }
}

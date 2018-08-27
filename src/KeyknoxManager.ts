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
  private myPublicKeys: VirgilPublicKey | VirgilPublicKey[];

  private readonly keyknoxClient: IKeyknoxClient;
  private readonly keyknoxCrypto: IKeyknoxCrypto;

  get privateKey(): VirgilPrivateKey {
    return this.myPrivateKey;
  }

  get publicKeys(): VirgilPublicKey | VirgilPublicKey[] {
    return this.myPublicKeys;
  }

  constructor(
    accessTokenProvider: IAccessTokenProvider,
    privateKey: VirgilPrivateKey,
    publicKeys: VirgilPublicKey | VirgilPublicKey[],
    keyknoxClient?: IKeyknoxClient,
    keyknoxCrypto?: IKeyknoxCrypto,
  ) {
    this.accessTokenProvider = accessTokenProvider;
    this.myPrivateKey = privateKey;
    this.myPublicKeys = publicKeys;
    this.keyknoxClient = keyknoxClient || new KeyknoxClient();
    this.keyknoxCrypto = keyknoxCrypto || new KeyknoxCrypto();
  }

  async pushValue(value: Buffer, previousHash?: Buffer): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      value,
      this.myPrivateKey,
      this.myPublicKeys,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      previousHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async pullValue(): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'get' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pullValue(token.toString());
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async resetValue(): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({ operation: 'delete' });
    return this.keyknoxClient.resetValue(token.toString());
  }

  async updateValue(options: {
    value: Buffer;
    previousHash: Buffer;
    newPrivateKey?: VirgilPrivateKey;
    newPublicKeys?: VirgilPublicKey | VirgilPublicKey[];
  }): Promise<DecryptedKeyknoxValue> {
    const { value, previousHash, newPrivateKey, newPublicKeys } = options;
    if (!newPrivateKey && !newPublicKeys) {
      return this.pushValue(value, previousHash);
    }
    const decryptedKeyknoxValue = await this.pullValue();
    if (newPrivateKey) {
      this.myPrivateKey = newPrivateKey;
    }
    if (newPublicKeys) {
      this.myPublicKeys = newPublicKeys;
    }
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      decryptedKeyknoxValue.value,
      this.myPrivateKey,
      this.myPublicKeys,
    );
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async updateRecipients(options: {
    newPrivateKey?: VirgilPrivateKey;
    newPublicKeys?: VirgilPublicKey | VirgilPublicKey[];
  }): Promise<DecryptedKeyknoxValue> {
    const { newPrivateKey, newPublicKeys } = options;
    const decryptedKeyknoxValue = await this.pullValue();
    if (!decryptedKeyknoxValue.meta.byteLength && !decryptedKeyknoxValue.value.byteLength) {
      return decryptedKeyknoxValue;
    }
    if (newPrivateKey) {
      this.myPrivateKey = newPrivateKey;
    }
    if (newPublicKeys) {
      this.myPublicKeys = newPublicKeys;
    }
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      decryptedKeyknoxValue.value,
      this.myPrivateKey,
      this.myPublicKeys,
    );
    const token = await this.accessTokenProvider.getToken({ operation: 'put' });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }
}

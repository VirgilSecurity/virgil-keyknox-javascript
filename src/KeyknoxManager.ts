import IKeyknoxCrypto from './cryptos/IKeyknoxCrypto';
import { KeyknoxClient } from './KeyknoxClient';
import { IPrivateKey, IPublicKey, IAccessTokenProvider } from './types';

export default class KeyknoxManager {
  private myPrivateKey: IPrivateKey;
  private myPublicKeys: IPublicKey | IPublicKey[];

  private readonly keyknoxClient: KeyknoxClient;
  private readonly keyknoxCrypto: IKeyknoxCrypto;

  get privateKey(): IPrivateKey {
    return this.myPrivateKey;
  }

  get publicKeys(): IPublicKey | IPublicKey[] {
    return this.myPublicKeys;
  }

  constructor(
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
    keyknoxCrypto: IKeyknoxCrypto,
    keyknoxClient: KeyknoxClient,
  ) {
    this.myPrivateKey = privateKey;
    this.myPublicKeys = publicKeys;
    this.keyknoxCrypto = keyknoxCrypto;
    this.keyknoxClient = keyknoxClient;
  }

  static create(
    accessTokenProvider: IAccessTokenProvider,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
    keyknoxCrypto: IKeyknoxCrypto,
  ) {
    const keyknoxClient = new KeyknoxClient(accessTokenProvider);
    return new KeyknoxManager(privateKey, publicKeys, keyknoxCrypto, keyknoxClient);
  }

  async pushValue(value: string, previousHash?: string) {
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      value,
      this.myPrivateKey,
      this.myPublicKeys,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      previousHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async pullValue() {
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Pull();
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async resetValue() {
    return this.keyknoxClient.v1Reset();
  }

  async updateValue(options: {
    value: string;
    previousHash: string;
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }) {
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
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async updateRecipients(options: {
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }) {
    const { newPrivateKey, newPublicKeys } = options;
    const decryptedKeyknoxValue = await this.pullValue();
    if (!decryptedKeyknoxValue.meta.length && !decryptedKeyknoxValue.value.length) {
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
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }
}

import { IKeyknoxCrypto } from './IKeyknoxCrypto';
import { KeyknoxClient } from './KeyknoxClient';
import {
  IPrivateKey,
  IPublicKey,
  IAccessTokenProvider,
  DecryptedKeyknoxValueV1,
  EncryptedKeyknoxValueV1,
  DecryptedKeyknoxValueV2,
  EncryptedKeyknoxValueV2,
} from './types';

export class KeyknoxManager {
  private readonly myKeyknoxCrypto: IKeyknoxCrypto;
  private readonly keyknoxClient: KeyknoxClient;

  get keyknoxCrypto(): IKeyknoxCrypto {
    return this.myKeyknoxCrypto;
  }

  constructor(keyknoxCrypto: IKeyknoxCrypto, keyknoxClient: KeyknoxClient) {
    this.myKeyknoxCrypto = keyknoxCrypto;
    this.keyknoxClient = keyknoxClient;
  }

  static create(accessTokenProvider: IAccessTokenProvider, keyknoxCrypto: IKeyknoxCrypto) {
    const keyknoxClient = new KeyknoxClient(accessTokenProvider);
    return new KeyknoxManager(keyknoxCrypto, keyknoxClient);
  }

  async v1Push(
    value: string,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
    keyknoxHash?: string,
  ) {
    const { metadata, encryptedData } = this.myKeyknoxCrypto.encrypt(
      value,
      privateKey,
      publicKeys,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      keyknoxHash,
    );
    return this.v1Decrypt(encryptedKeyknoxValue, privateKey, publicKeys);
  }

  async v1Pull(privateKey: IPrivateKey, publicKeys: IPublicKey | IPublicKey[]) {
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Pull();
    return this.v1Decrypt(encryptedKeyknoxValue, privateKey, publicKeys);
  }

  async v1Reset() {
    return this.keyknoxClient.v1Reset();
  }

  async v1Update(options: {
    value: string;
    privateKey: IPrivateKey;
    publicKeys: IPublicKey | IPublicKey[];
    keyknoxHash: string;
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }) {
    const { value, privateKey, publicKeys, keyknoxHash, newPrivateKey, newPublicKeys } = options;
    if (!newPrivateKey && !newPublicKeys) {
      return this.v1Push(value, privateKey, publicKeys, keyknoxHash);
    }
    const decryptedKeyknoxValue = await this.v1Pull(privateKey, publicKeys);
    const myPrivateKey = newPrivateKey || privateKey;
    const myPublicKeys = newPublicKeys || publicKeys;
    const { metadata, encryptedData } = this.myKeyknoxCrypto.encrypt(
      decryptedKeyknoxValue.value,
      myPrivateKey,
      myPublicKeys,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.v1Decrypt(encryptedKeyknoxValue, myPrivateKey, myPublicKeys);
  }

  async v1UpdateRecipients(options: {
    privateKey: IPrivateKey;
    publicKeys: IPublicKey | IPublicKey[];
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }) {
    const { privateKey, publicKeys, newPrivateKey, newPublicKeys } = options;
    const decryptedKeyknoxValue = await this.v1Pull(privateKey, publicKeys);
    if (!decryptedKeyknoxValue.meta.length && !decryptedKeyknoxValue.value.length) {
      return decryptedKeyknoxValue;
    }
    const myPrivateKey = newPrivateKey || privateKey;
    const myPublicKeys = newPublicKeys || publicKeys;
    const { metadata, encryptedData } = this.myKeyknoxCrypto.encrypt(
      decryptedKeyknoxValue.value,
      myPrivateKey,
      myPublicKeys,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.v1Decrypt(encryptedKeyknoxValue, myPrivateKey, myPublicKeys);
  }

  async v2Push(options: {
    root: string;
    path: string;
    key: string;
    identities?: string[];
    value: string;
    privateKey: IPrivateKey;
    publicKeys: IPublicKey | IPublicKey[],
    keyknoxHash?: string;
  }) {
    const { value, privateKey, publicKeys, ...pushOptions } = options;
    const { metadata, encryptedData } = this.encrypt(value, privateKey, publicKeys);
    const encryptedKeyknoxValue = await this.keyknoxClient.v2Push({
      ...pushOptions,
      value: encryptedData,
      meta: metadata,
    });
    return this.v2Decrypt(encryptedKeyknoxValue, privateKey, publicKeys);
  }

  async v2Pull(options: {
    root: string;
    path: string;
    key: string;
    identity?: string;
    privateKey: IPrivateKey;
    publicKeys: IPublicKey | IPublicKey[];
  }) {
    const { privateKey, publicKeys, ...pullOptions } = options;
    const encryptedKeyknoxValue = await this.keyknoxClient.v2Pull(pullOptions);
    return this.v2Decrypt(encryptedKeyknoxValue, privateKey, publicKeys);
  }

  async v2GetKeys(options: {
    root?: string;
    path?: string;
    identity?: string;
  }) {
    return this.keyknoxClient.v2GetKeys(options);
  }

  async v2Reset(options: {
    root?: string;
    path?: string;
    key?: string;
    identity?: string;
  }) {
    return this.keyknoxClient.v2Reset(options);
  }

  private v1Decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValueV1,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ) {
    const { meta, value, ...otherData } = encryptedKeyknoxValue;
    const decryptedValue = this.myKeyknoxCrypto.decrypt(meta, value, privateKey, publicKeys);
    const result: DecryptedKeyknoxValueV1 = { ...otherData, meta, value: decryptedValue };
    return result;
  }

  private v2Decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValueV2,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ) {
    const { meta, value, ...otherData } = encryptedKeyknoxValue;
    const decryptedValue = this.myKeyknoxCrypto.decrypt(meta, value, privateKey, publicKeys);
    const result: DecryptedKeyknoxValueV2 = { ...otherData, meta, value: decryptedValue };
    return result;
  }

  private encrypt(data: string, privateKey: IPrivateKey, publicKeys: IPublicKey | IPublicKey[]) {
    return this.myKeyknoxCrypto.encrypt(data, privateKey, publicKeys);
  }
}

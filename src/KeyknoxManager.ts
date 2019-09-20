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

  async v1Push(value: string, keyknoxHash?: string) {
    const { metadata, encryptedData } = this.keyknoxCrypto.encrypt(
      value,
      this.myPrivateKey,
      this.myPublicKeys,
    );
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Push(
      metadata,
      encryptedData,
      keyknoxHash,
    );
    return this.v1Decrypt(encryptedKeyknoxValue);
  }

  async v1Pull() {
    const encryptedKeyknoxValue = await this.keyknoxClient.v1Pull();
    return this.v1Decrypt(encryptedKeyknoxValue);
  }

  async v1Reset() {
    return this.keyknoxClient.v1Reset();
  }

  async v1Update(options: {
    value: string;
    keyknoxHash: string;
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }) {
    const { value, keyknoxHash, newPrivateKey, newPublicKeys } = options;
    if (!newPrivateKey && !newPublicKeys) {
      return this.v1Push(value, keyknoxHash);
    }
    const decryptedKeyknoxValue = await this.v1Pull();
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
    return this.v1Decrypt(encryptedKeyknoxValue);
  }

  async v1UpdateRecipients(options: {
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }) {
    const { newPrivateKey, newPublicKeys } = options;
    const decryptedKeyknoxValue = await this.v1Pull();
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
    return this.v1Decrypt(encryptedKeyknoxValue);
  }

  async v2Push(options: {
    root: string;
    path: string;
    key: string;
    identities?: string[];
    value: string;
    keyknoxHash?: string;
  }) {
    const { value, ...otherOptions } = options;
    const { metadata, encryptedData } = this.encrypt(value);
    const encryptedKeyknoxValue = await this.keyknoxClient.v2Push({
      ...otherOptions,
      value: encryptedData,
      meta: metadata,
    });
    const decryptedKeyknoxValue = this.v2Decrypt(encryptedKeyknoxValue);
    return decryptedKeyknoxValue;
  }

  async v2Pull(options: {
    root: string;
    path: string;
    key: string;
    identity?: string;
  }) {
    const encryptedKeyknoxValue = await this.keyknoxClient.v2Pull(options);
    const decryptedKeyknoxValue = this.v2Decrypt(encryptedKeyknoxValue);
    return decryptedKeyknoxValue;
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

  private v1Decrypt(encryptedKeyknoxValue: EncryptedKeyknoxValueV1) {
    const { meta, value, ...otherData } = encryptedKeyknoxValue;
    const decryptedValue = this.keyknoxCrypto.decrypt(meta, value, this.myPrivateKey, this.myPublicKeys);
    const result: DecryptedKeyknoxValueV1 = { ...otherData, meta, value: decryptedValue };
    return result;
  }

  private v2Decrypt(encryptedKeyknoxValue: EncryptedKeyknoxValueV2) {
    const { meta, value, ...otherData } = encryptedKeyknoxValue;
    const decryptedValue = this.keyknoxCrypto.decrypt(meta, value, this.myPrivateKey, this.myPublicKeys);
    const result: DecryptedKeyknoxValueV2 = { ...otherData, meta, value: decryptedValue };
    return result;
  }

  private encrypt(data: string) {
    return this.keyknoxCrypto.encrypt(data, this.myPrivateKey, this.myPublicKeys);
  }
}

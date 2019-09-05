import IKeyknoxClient from './clients/IKeyknoxClient';
import KeyknoxClient from './clients/KeyknoxClient';
import IKeyknoxCrypto from './cryptos/IKeyknoxCrypto';
import { DecryptedKeyknoxValue } from './entities';
import { IPrivateKey, IPublicKey, IAccessTokenProvider } from './types';

export default class KeyknoxManager {
  private readonly SERVICE_NAME = 'keyknox';

  private readonly accessTokenProvider: IAccessTokenProvider;

  private myPrivateKey: IPrivateKey;
  private myPublicKeys: IPublicKey | IPublicKey[];

  private readonly keyknoxClient: IKeyknoxClient;
  private readonly keyknoxCrypto: IKeyknoxCrypto;

  get privateKey(): IPrivateKey {
    return this.myPrivateKey;
  }

  get publicKeys(): IPublicKey | IPublicKey[] {
    return this.myPublicKeys;
  }

  constructor(
    accessTokenProvider: IAccessTokenProvider,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
    keyknoxCrypto: IKeyknoxCrypto,
    keyknoxClient?: IKeyknoxClient,
  ) {
    this.accessTokenProvider = accessTokenProvider;
    this.myPrivateKey = privateKey;
    this.myPublicKeys = publicKeys;
    this.keyknoxCrypto = keyknoxCrypto;
    this.keyknoxClient = keyknoxClient || new KeyknoxClient();
  }

  async pushValue(value: string, previousHash?: string): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({
      service: this.SERVICE_NAME,
      operation: 'put',
    });
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
    const token = await this.accessTokenProvider.getToken({
      service: this.SERVICE_NAME,
      operation: 'get',
    });
    const encryptedKeyknoxValue = await this.keyknoxClient.pullValue(token.toString());
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async resetValue(): Promise<DecryptedKeyknoxValue> {
    const token = await this.accessTokenProvider.getToken({
      service: this.SERVICE_NAME,
      operation: 'delete',
    });
    return this.keyknoxClient.resetValue(token.toString());
  }

  async updateValue(options: {
    value: string;
    previousHash: string;
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
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
    const token = await this.accessTokenProvider.getToken({
      service: this.SERVICE_NAME,
      operation: 'put',
    });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }

  async updateRecipients(options: {
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }): Promise<DecryptedKeyknoxValue> {
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
    const token = await this.accessTokenProvider.getToken({
      service: this.SERVICE_NAME,
      operation: 'put',
    });
    const encryptedKeyknoxValue = await this.keyknoxClient.pushValue(
      metadata,
      encryptedData,
      token.toString(),
      decryptedKeyknoxValue.keyknoxHash,
    );
    return this.keyknoxCrypto.decrypt(encryptedKeyknoxValue, this.myPrivateKey, this.myPublicKeys);
  }
}

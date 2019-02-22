import { EncryptedKeyknoxValue, DecryptedKeyknoxValue } from '../entities';

export default interface IKeyknoxClient {
  pushValue(
    meta: Buffer,
    value: Buffer,
    token: string,
    previousHash?: Buffer,
  ): Promise<EncryptedKeyknoxValue>;

  pullValue(token: string): Promise<EncryptedKeyknoxValue>;

  resetValue(token: string): Promise<DecryptedKeyknoxValue>;
}

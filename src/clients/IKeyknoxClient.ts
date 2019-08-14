import { EncryptedKeyknoxValue, DecryptedKeyknoxValue } from '../entities';

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
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

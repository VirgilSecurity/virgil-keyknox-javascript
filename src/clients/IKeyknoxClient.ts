import { EncryptedKeyknoxValue, DecryptedKeyknoxValue } from '../entities';

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IKeyknoxClient {
  pushValue(
    meta: string,
    value: string,
    token: string,
    previousHash?: string,
  ): Promise<EncryptedKeyknoxValue>;

  pullValue(token: string): Promise<EncryptedKeyknoxValue>;

  resetValue(token: string): Promise<DecryptedKeyknoxValue>;
}

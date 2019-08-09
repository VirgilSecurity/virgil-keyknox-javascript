import { DecryptedKeyknoxValue, EncryptedKeyknoxValue } from '../entities';
import { IPrivateKey, IPublicKey } from '../types';

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IKeyknoxCrypto {
  decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValue,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ): DecryptedKeyknoxValue;

  encrypt(
    data: Buffer,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ): {
    encryptedData: Buffer;
    metadata: Buffer;
  };
}

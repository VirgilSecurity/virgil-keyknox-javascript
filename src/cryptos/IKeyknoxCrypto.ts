import { DecryptedKeyknoxValue, EncryptedKeyknoxValue } from '../entities';
import { IPrivateKey, IPublicKey } from '../types';

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

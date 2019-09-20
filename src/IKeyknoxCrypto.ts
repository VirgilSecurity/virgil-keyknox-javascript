import { IPrivateKey, IPublicKey } from './types';

export interface IKeyknoxCrypto {
  decrypt(
    metadata: string,
    encryptedData: string,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ): string;

  encrypt(
    data: string,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ): {
    encryptedData: string;
    metadata: string;
  };
}

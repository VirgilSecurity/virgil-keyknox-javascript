import { IPrivateKey, IPublicKey, IGroupSession } from './types';

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
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

  importGroupSession(epochMessages: string[]): IGroupSession;
}

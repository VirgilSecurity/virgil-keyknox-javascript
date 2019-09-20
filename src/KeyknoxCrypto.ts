import { IKeyknoxCrypto } from './IKeyknoxCrypto';
import { ICrypto, IPrivateKey, IPublicKey } from './types';

export class KeyknoxCrypto implements IKeyknoxCrypto {
  private readonly crypto: ICrypto;

  constructor(crypto: ICrypto) {
    this.crypto = crypto;
  }

  decrypt(
    metadata: string,
    encryptedData: string,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ) {
    if (!encryptedData.length || !metadata.length) {
      if (encryptedData.length || metadata.length) {
        throw new TypeError("'metadata' or 'encryptedData' is empty");
      }
      return encryptedData;
    }
    const decrypted = this.crypto.decryptThenVerifyDetached(
      { value: encryptedData, encoding: 'base64' },
      { value: metadata, encoding: 'base64' },
      privateKey,
      publicKeys,
    );
    return decrypted.toString('base64');
  }

  encrypt(
    data: string,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ) {
    const { metadata, encryptedData } = this.crypto.signThenEncryptDetached(
      { value: data, encoding: 'base64' },
      privateKey,
      publicKeys,
    );
    return {
      metadata: metadata.toString('base64'),
      encryptedData: encryptedData.toString('base64'),
    };
  }
}

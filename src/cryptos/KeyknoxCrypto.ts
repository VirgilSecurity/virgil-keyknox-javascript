import { EncryptedKeyknoxValue, DecryptedKeyknoxValue } from '../entities';
import { ICrypto, IPrivateKey, IPublicKey } from '../types';
import IKeyknoxCrypto from './IKeyknoxCrypto';

export default class KeyknoxCrypto implements IKeyknoxCrypto {
  private readonly crypto: ICrypto;

  constructor(crypto: ICrypto) {
    this.crypto = crypto;
  }

  decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValue,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ): DecryptedKeyknoxValue {
    const { value, meta } = encryptedKeyknoxValue;
    if (!value.length || !meta.length) {
      if (value.length || meta.length) {
        throw new TypeError("'EncryptedKeyknoxValue' is invalid");
      }
      return encryptedKeyknoxValue;
    }
    const decrypted = this.crypto.decryptThenVerifyDetached(
      { value: value, encoding: 'base64' },
      { value: meta, encoding: 'base64' },
      privateKey,
      publicKeys,
    );
    return {
      ...encryptedKeyknoxValue,
      value: decrypted.toString('base64'),
    };
  }

  encrypt(
    data: string,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ): {
    encryptedData: string;
    metadata: string;
  } {
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

import { VirgilCrypto } from 'virgil-crypto';
import {
  VirgilPrivateKey,
  VirgilPublicKey,
  IVirgilCrypto,
} from 'virgil-crypto/dist/types/interfaces';

import { EncryptedKeyknoxValue, DecryptedKeyknoxValue } from '../entities';
import IKeyknoxCrypto from './IKeyknoxCrypto';

export default class KeyknoxCrypto implements IKeyknoxCrypto {
  private readonly crypto: IVirgilCrypto;

  constructor(crypto?: IVirgilCrypto) {
    this.crypto = crypto || new VirgilCrypto();
  }

  decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValue,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
  ): DecryptedKeyknoxValue {
    const { value, meta } = encryptedKeyknoxValue;
    if (!value.byteLength || !meta.byteLength) {
      if (value.byteLength || meta.byteLength) {
        throw new TypeError("'EncryptedKeyknoxValue' is invalid");
      }
      return encryptedKeyknoxValue;
    }
    const decrypted = this.crypto.decryptThenVerifyDetached(value, meta, privateKey, publicKey);
    return {
      ...encryptedKeyknoxValue,
      value: decrypted,
    };
  }

  encrypt(
    data: Buffer,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
  ): {
    encryptedData: Buffer;
    metadata: Buffer;
  } {
    return this.crypto.signThenEncryptDetached(data, privateKey, publicKey);
  }
}

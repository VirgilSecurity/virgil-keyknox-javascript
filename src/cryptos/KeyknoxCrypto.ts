import { VirgilPrivateKey, VirgilPublicKey, VirgilCrypto } from 'virgil-crypto';

import { EncryptedKeyknoxValue, DecryptedKeyknoxValue } from '../entities';
import IKeyknoxCrypto from './IKeyknoxCrypto';

export default class KeyknoxCrypto implements IKeyknoxCrypto {
  private readonly crypto: VirgilCrypto;

  constructor(crypto?: VirgilCrypto) {
    this.crypto = crypto || new VirgilCrypto();
  }

  decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValue,
    privateKey: VirgilPrivateKey,
    publicKeys: VirgilPublicKey | VirgilPublicKey[],
  ): DecryptedKeyknoxValue {
    const { value, meta } = encryptedKeyknoxValue;
    if (!value.byteLength || !meta.byteLength) {
      if (value.byteLength || meta.byteLength) {
        throw new TypeError("'EncryptedKeyknoxValue' is invalid");
      }
      return encryptedKeyknoxValue;
    }
    const decrypted = this.crypto.decryptThenVerifyDetached(value, meta, privateKey, publicKeys);
    return {
      ...encryptedKeyknoxValue,
      value: decrypted,
    };
  }

  encrypt(
    data: Buffer,
    privateKey: VirgilPrivateKey,
    publicKeys: VirgilPublicKey | VirgilPublicKey[],
  ): {
    encryptedData: Buffer;
    metadata: Buffer;
  } {
    return this.crypto.signThenEncryptDetached(data, privateKey, publicKeys);
  }
}

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
    const value = this.crypto.decryptThenVerifyDetached(
      encryptedKeyknoxValue.value,
      encryptedKeyknoxValue.meta,
      privateKey,
      publicKey,
    );
    return {
      ...encryptedKeyknoxValue,
      value,
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

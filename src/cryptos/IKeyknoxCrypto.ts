import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto';

import { DecryptedKeyknoxValue, EncryptedKeyknoxValue } from '../entities';

export default interface IKeyknoxCrypto {
  decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValue,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
  ): DecryptedKeyknoxValue;

  encrypt(
    data: Buffer,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
  ): {
    encryptedData: Buffer;
    metadata: Buffer;
  };
}

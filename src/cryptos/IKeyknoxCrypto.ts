import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto';

import { DecryptedKeyknoxValue, EncryptedKeyknoxValue } from '../entities';

export default interface IKeyknoxCrypto {
  decrypt(
    encryptedKeyknoxValue: EncryptedKeyknoxValue,
    privateKey: VirgilPrivateKey,
    publicKeys: VirgilPublicKey | VirgilPublicKey[],
  ): DecryptedKeyknoxValue;

  encrypt(
    data: Buffer,
    privateKey: VirgilPrivateKey,
    publicKeys: VirgilPublicKey | VirgilPublicKey[],
  ): {
    encryptedData: Buffer;
    metadata: Buffer;
  };
}

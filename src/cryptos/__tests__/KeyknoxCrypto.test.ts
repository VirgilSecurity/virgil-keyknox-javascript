import { VirgilCrypto } from 'virgil-crypto';
import {
  VirgilPrivateKey,
  VirgilPublicKey,
  IVirgilCrypto,
} from 'virgil-crypto/dist/types/interfaces';

import KeyknoxCrypto from '../KeyknoxCrypto';

describe('KeyknoxCrypto', () => {
  let keyknoxCrypto: KeyknoxCrypto;
  let virgilCrypto: IVirgilCrypto;

  beforeEach(() => {
    virgilCrypto = new VirgilCrypto();
    keyknoxCrypto = new KeyknoxCrypto(virgilCrypto);
  });

  describe('decrypt', () => {
    function createEncryptedKeyknoxValue(
      data: Buffer,
      privateKey: VirgilPrivateKey,
      publicKey: VirgilPublicKey,
    ) {
      const { encryptedData, metadata } = virgilCrypto.signThenEncryptDetached(
        data,
        privateKey,
        publicKey,
      );
      return {
        meta: metadata,
        value: encryptedData,
        version: '1.0',
        keyknoxHash: Buffer.from('keyknoxHash'),
      };
    }

    it("should call 'virgilCrypto.decryptThenVerifyDetached'", () => {
      const spy = jest.spyOn(virgilCrypto, 'decryptThenVerifyDetached');
      const data = Buffer.from('data');
      const { privateKey, publicKey } = virgilCrypto.generateKeys();
      const encryptedKeyknoxValue = createEncryptedKeyknoxValue(data, privateKey, publicKey);
      keyknoxCrypto.decrypt(encryptedKeyknoxValue, privateKey, publicKey);
      expect(spy).toBeCalledWith(
        encryptedKeyknoxValue.value,
        encryptedKeyknoxValue.meta,
        privateKey,
        publicKey,
      );
      spy.mockReset();
    });

    it("should return 'DecryptedKeyknoxValue'", () => {
      const data = Buffer.from('data');
      const { privateKey, publicKey } = virgilCrypto.generateKeys();
      const encryptedKeyknoxValue = createEncryptedKeyknoxValue(data, privateKey, publicKey);
      const decryptedKeyknoxValue = keyknoxCrypto.decrypt(
        encryptedKeyknoxValue,
        privateKey,
        publicKey,
      );
      expect(decryptedKeyknoxValue.value).toEqual(data);
      expect(decryptedKeyknoxValue.meta).toBe(encryptedKeyknoxValue.meta);
      expect(decryptedKeyknoxValue.version).toBe(encryptedKeyknoxValue.version);
      expect(decryptedKeyknoxValue.keyknoxHash).toBe(encryptedKeyknoxValue.keyknoxHash);
    });
  });

  describe('encrypt', () => {
    it("should call 'virgilCrypto.signThenEncryptDetached'", () => {
      const spy = jest.spyOn(virgilCrypto, 'signThenEncryptDetached');
      const data = Buffer.from('data');
      const { privateKey, publicKey } = virgilCrypto.generateKeys();
      keyknoxCrypto.encrypt(data, privateKey, publicKey);
      expect(spy).toBeCalledWith(data, privateKey, publicKey);
      spy.mockReset();
    });

    it("should return 'entrypedData' and 'metadata'", () => {
      const data = Buffer.from('data');
      const { privateKey, publicKey } = virgilCrypto.generateKeys();
      const { encryptedData, metadata } = keyknoxCrypto.encrypt(data, privateKey, publicKey);
      expect(encryptedData).toBeDefined();
      expect(metadata).toBeDefined();
    });
  });
});

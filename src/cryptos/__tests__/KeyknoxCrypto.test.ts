import { expect } from 'chai';

import { initCrypto, VirgilCrypto } from 'virgil-crypto';

import { KeyknoxCrypto } from '../KeyknoxCrypto';

describe('KeyknoxCrypto', () => {
  let keyknoxCrypto: KeyknoxCrypto;
  let virgilCrypto: VirgilCrypto;

  before(async () => {
    await initCrypto();
  });

  beforeEach(() => {
    virgilCrypto = new VirgilCrypto();
    keyknoxCrypto = new KeyknoxCrypto(virgilCrypto);
  });

  it('encrypts and decrypts successfully', () => {
    const data = 'ZGF0YQ==';
    const version = '1.0';
    const keyknoxHash = 'a2V5a25veEhhc2g=';
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const { encryptedData, metadata } = keyknoxCrypto.encrypt(data, privateKey, publicKey);
    const encryptedKeyknoxValue = {
      version,
      keyknoxHash,
      meta: metadata,
      value: encryptedData,
    };
    const decryptedKeyknoxValue = keyknoxCrypto.decrypt(
      encryptedKeyknoxValue,
      privateKey,
      publicKey,
    );
    expect(decryptedKeyknoxValue.meta).to.equal(encryptedKeyknoxValue.meta);
    expect(decryptedKeyknoxValue.value).to.equal(data);
    expect(decryptedKeyknoxValue.version).to.equal(encryptedKeyknoxValue.version);
    expect(decryptedKeyknoxValue.keyknoxHash).to.equal(encryptedKeyknoxValue.keyknoxHash);
  });
});

import { Buffer as NodeBuffer } from 'buffer';
import { expect } from 'chai';

import { initCrypto, VirgilCrypto } from 'virgil-crypto';

import KeyknoxCrypto from '../KeyknoxCrypto';

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
    const data = NodeBuffer.from('data');
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const { encryptedData, metadata } = keyknoxCrypto.encrypt(data, privateKey, publicKey);
    const encryptedKeyknoxValue = {
      meta: metadata,
      value: encryptedData,
      version: '1.0',
      keyknoxHash: NodeBuffer.from('keyknoxHash'),
    };
    const decryptedKeyknoxValue = keyknoxCrypto.decrypt(
      encryptedKeyknoxValue,
      privateKey,
      publicKey,
    );
    expect(decryptedKeyknoxValue.meta.equals(encryptedKeyknoxValue.meta)).to.be.true;
    expect(decryptedKeyknoxValue.value.equals(data)).to.be.true;
    expect(decryptedKeyknoxValue.version).to.equal('1.0');
    expect(decryptedKeyknoxValue.keyknoxHash.equals(encryptedKeyknoxValue.keyknoxHash)).to.be.true;
  });
});

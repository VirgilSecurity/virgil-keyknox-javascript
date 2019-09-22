import { expect } from 'chai';

import { initCrypto, hasFoundationModules, VirgilCrypto } from 'virgil-crypto';

import { KeyknoxCrypto } from '../KeyknoxCrypto';

describe('KeyknoxCrypto', () => {
  let keyknoxCrypto: KeyknoxCrypto;
  let virgilCrypto: VirgilCrypto;

  before(async () => {
    if (!hasFoundationModules()) {
      await initCrypto();
    }
  });

  beforeEach(() => {
    virgilCrypto = new VirgilCrypto();
    keyknoxCrypto = new KeyknoxCrypto(virgilCrypto);
  });

  it('returns if encryptedData and metadata are empty', () => {
    const metadata = '';
    const encryptedData = '';
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const decryptedValue = keyknoxCrypto.decrypt(metadata, encryptedData, privateKey, publicKey);
    expect(decryptedValue).to.equal(encryptedData);
  });

  it('throws if metadata or encryptedData is empty', () => {
    const data = 'ZGF0YQ==';
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const { encryptedData } = keyknoxCrypto.encrypt(data, privateKey, publicKey);
    const error = () => {
      keyknoxCrypto.decrypt('', encryptedData, privateKey, publicKey);
    };
    expect(error).to.throw(TypeError);
  });

  it('encrypts and decrypts successfully', () => {
    const data = 'ZGF0YQ==';
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const { encryptedData, metadata } = keyknoxCrypto.encrypt(data, privateKey, publicKey);
    const decryptedValue = keyknoxCrypto.decrypt(metadata, encryptedData, privateKey, publicKey);
    expect(decryptedValue).to.equal(data);
  });

  it('imports group session successfully', () => {
    const groupSession = virgilCrypto.generateGroupSession({
      value: 'group-session',
      encoding: 'utf8',
    });
    groupSession.addNewEpoch();
    const epochMessages = groupSession
      .export()
      .map(epochMessage => epochMessage.toString('base64'));
    keyknoxCrypto.importGroupSession(epochMessages);
  });
});

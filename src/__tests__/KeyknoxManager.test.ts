import { expect } from 'chai';
import uuid from 'uuid/v4';

import { initCrypto, VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';

import { KeyknoxCrypto } from '../KeyknoxCrypto';
import { KeyknoxClient } from '../KeyknoxClient';
import { KeyknoxManager } from '../KeyknoxManager';

type VirgilPublicKey = import('virgil-crypto').VirgilPublicKey;
type VirgilKeyPair = import('virgil-crypto').VirgilKeyPair;

describe('KeyknoxManager', () => {
  let virgilCrypto: VirgilCrypto;
  let jwtGenerator: JwtGenerator;
  let keyknoxManager: KeyknoxManager;
  let keyPair: VirgilKeyPair;

  function getRandomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
  }

  function generateKeyPairs(amount: number) {
    const keyPairs = [];
    for (let i = 0; i < amount; i += 1) {
      keyPairs.push(virgilCrypto.generateKeys());
    }
    return keyPairs;
  }

  function getPublicKeys(keyPairs: VirgilKeyPair[], start: number, end: number): VirgilPublicKey[] {
    return keyPairs.slice(start, end).map(keyPair => keyPair.publicKey);
  }

  function createKeyknoxManager(identity?: string): KeyknoxManager {
    const accessTokenProvider = new GeneratorJwtProvider(
      jwtGenerator,
      undefined,
      identity || uuid(),
    );
    return new KeyknoxManager(
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(accessTokenProvider, process.env.API_URL),
    );
  }

  before(async () => {
    await initCrypto();
  });

  beforeEach(() => {
    virgilCrypto = new VirgilCrypto();
    const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
    const apiKey = virgilCrypto.importPrivateKey({
      value: process.env.API_KEY!,
      encoding: 'base64',
    });
    jwtGenerator = new JwtGenerator({
      apiKey,
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: virgilAccessTokenSigner,
    });
    keyPair = virgilCrypto.generateKeys();
    keyknoxManager = createKeyknoxManager();
  });

  it('KTC-6', async () => {
    const value = 'dmFsdWUK';
    const decryptedKeyknoxValue = await keyknoxManager.v1Push(
      value,
      keyPair.privateKey,
      keyPair.publicKey,
    );
    expect(decryptedKeyknoxValue.value).to.equal(value);
  });

  it('KTC-7', async () => {
    const value = 'dmFsdWUK';
    await keyknoxManager.v1Push(value, keyPair.privateKey, keyPair.publicKey);
    const decryptedKeyknoxValue = await keyknoxManager.v1Pull(
      keyPair.privateKey,
      keyPair.publicKey,
    );
    expect(decryptedKeyknoxValue.value).to.equal(value);
  });

  it('KTC-8', async () => {
    const decryptedKeyknoxValue = await keyknoxManager.v1Pull(
      keyPair.privateKey,
      keyPair.publicKey,
    );
    expect(decryptedKeyknoxValue.meta.length).to.equal(0);
    expect(decryptedKeyknoxValue.value.length).to.equal(0);
    expect(decryptedKeyknoxValue.version).to.equal('1.0');
  });

  it('KTC-9', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const keyPairs = generateKeyPairs(50);
    const publicKeys1 = getPublicKeys(keyPairs, 0, 25);
    const publicKeys2 = getPublicKeys(keyPairs, 25, 50);
    const keyknoxManager1 = createKeyknoxManager(identity);
    await keyknoxManager1.v1Push(value, keyPairs[0].privateKey, publicKeys1);
    const decryptedKeyknoxValue = await keyknoxManager1.v1Pull(keyPairs[0].privateKey, publicKeys1);
    expect(decryptedKeyknoxValue.value).equal(value);
    const keyknoxManager2 = createKeyknoxManager(identity);
    try {
      await keyknoxManager2.v1Pull(keyPairs[0].privateKey, publicKeys2);
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-10', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const keyPairs = generateKeyPairs(50);
    const privateKey1 = keyPairs[getRandomInRange(0, 25)].privateKey;
    const privateKey2 = keyPairs[getRandomInRange(0, 25)].privateKey;
    const privateKey3 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(identity);
    await keyknoxManager1.v1Push(value, privateKey1, publicKeys);
    let decryptedKeyknoxValue = await keyknoxManager1.v1Pull(privateKey1, publicKeys);
    expect(decryptedKeyknoxValue.value).to.equal(value);
    const keyknoxManager2 = createKeyknoxManager(identity);
    decryptedKeyknoxValue = await keyknoxManager2.v1Pull(privateKey2, publicKeys);
    expect(decryptedKeyknoxValue.value).to.equal(value);
    const keyknoxManager3 = createKeyknoxManager(identity);
    try {
      await keyknoxManager3.v1Pull(privateKey3, publicKeys);
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-11', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const keyPairs = generateKeyPairs(50);
    const privateKey1 = keyPairs[getRandomInRange(0, 25)].privateKey;
    const privateKey2 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const privateKey3 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const privateKey4 = keyPairs[getRandomInRange(0, 25)].privateKey;
    const privateKey5 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const publicKeys1 = getPublicKeys(keyPairs, 0, 25);
    const publicKeys2 = getPublicKeys(keyPairs, 25, 50);
    const publicKeys3 = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(identity);
    await keyknoxManager1.v1Push(value, privateKey1, publicKeys1);
    const keyknoxManager2 = createKeyknoxManager(identity);
    let decryptedKeyknoxValue = await keyknoxManager2.v1UpdateRecipients({
      privateKey: privateKey1,
      publicKeys: publicKeys1,
      newPrivateKey: privateKey2,
      newPublicKeys: publicKeys2,
    });
    expect(decryptedKeyknoxValue.value).to.equal(value);
    const keyknoxManager3 = createKeyknoxManager(identity);
    decryptedKeyknoxValue = await keyknoxManager3.v1Pull(privateKey3, publicKeys2);
    expect(decryptedKeyknoxValue.value).to.equal(value);
    const keyknoxManager4 = createKeyknoxManager(identity);
    try {
      await keyknoxManager4.v1Pull(privateKey4, publicKeys2);
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
    const keyknoxManager5 = createKeyknoxManager(identity);
    try {
      await keyknoxManager5.v1Pull(privateKey5, publicKeys3);
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-12', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const updatedValue = 'dXBkYXRlZFZhbHVl';
    const keyPairs = generateKeyPairs(50);
    const privateKey1 = keyPairs[getRandomInRange(0, 25)].privateKey;
    const privateKey2 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const privateKey3 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const privateKey4 = keyPairs[getRandomInRange(0, 25)].privateKey;
    const privateKey5 = keyPairs[getRandomInRange(25, 50)].privateKey;
    const publicKeys1 = getPublicKeys(keyPairs, 0, 25);
    const publicKeys2 = getPublicKeys(keyPairs, 25, 50);
    const publicKeys3 = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(identity);
    let decryptedKeyknoxValue = await keyknoxManager1.v1Push(value, privateKey1, publicKeys1);
    const keyknoxManager2 = createKeyknoxManager(identity);
    decryptedKeyknoxValue = await keyknoxManager2.v1Update({
      privateKey: privateKey1,
      publicKeys: publicKeys1,
      value: updatedValue,
      keyknoxHash: decryptedKeyknoxValue.keyknoxHash,
      newPrivateKey: privateKey2,
      newPublicKeys: publicKeys2,
    });
    expect(decryptedKeyknoxValue.value).to.equal(value);
    const keyknoxManager3 = createKeyknoxManager(identity);
    decryptedKeyknoxValue = await keyknoxManager3.v1Pull(privateKey3, publicKeys2);
    expect(decryptedKeyknoxValue.value).to.equal(value);
    const keyknoxManager4 = createKeyknoxManager(identity);
    try {
      await keyknoxManager4.v1Pull(privateKey4, publicKeys2);
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
    const keyknoxManager5 = createKeyknoxManager(identity);
    try {
      await keyknoxManager5.v1Pull(privateKey5, publicKeys3);
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-13', async () => {
    const keyPairs = generateKeyPairs(50);
    const privateKey1 = keyPairs[0].privateKey;
    const privateKey2 = keyPairs[24].privateKey;
    const publicKeys1 = getPublicKeys(keyPairs, 0, 25);
    const publicKeys2 = getPublicKeys(keyPairs, 25, 50);
    const keyknoxManager = createKeyknoxManager();
    const decryptedKeyknoxValue = await keyknoxManager.v1UpdateRecipients({
      privateKey: privateKey1,
      publicKeys: publicKeys1,
      newPrivateKey: privateKey2,
      newPublicKeys: publicKeys2,
    });
    expect(decryptedKeyknoxValue.meta.length).to.equal(0);
    expect(decryptedKeyknoxValue.value.length).to.equal(0);
    expect(decryptedKeyknoxValue.version).to.equal('1.0');
  });

  it('KTC-14', async () => {
    const value = 'dmFsdWUK';
    await keyknoxManager.v1Push(value, keyPair.privateKey, keyPair.publicKey);
    const decryptedKeyknoxValue = await keyknoxManager.v1Reset();
    expect(decryptedKeyknoxValue.version).to.equal('2.0');
  });

  it('KTC-15', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const [keyPair1] = generateKeyPairs(1);
    const keyknoxManager1 = createKeyknoxManager(identity);
    const keyknoxManager2 = createKeyknoxManager(identity);
    await keyknoxManager1.v1Push(value, keyPair1.privateKey, keyPair1.publicKey);
    const decryptedKeyknoxValue = await keyknoxManager2.v1Reset();
    expect(decryptedKeyknoxValue.version).to.equal('2.0');
  });

  it('KTC-16', async () => {
    const virgilCrypto = new VirgilCrypto();
    const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
    const apiKey = virgilCrypto.importPrivateKey({
      value: process.env.API_KEY!,
      encoding: 'base64',
    });
    const jwtGenerator = new JwtGenerator({
      apiKey,
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: virgilAccessTokenSigner,
    });
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, uuid());
    const [keyPair] = generateKeyPairs(1);
    const keyknoxClient = new KeyknoxClient(accessTokenProvider, process.env.API_URL);
    const keyknoxManager = new KeyknoxManager(new KeyknoxCrypto(virgilCrypto), keyknoxClient);
    const value = 'dmFsdWUK';
    await keyknoxManager.v1Push(value, keyPair.privateKey, keyPair.publicKey);
    const encryptedKeyknoxValue = await keyknoxClient.v1Pull();
    const decryptedData = virgilCrypto.decryptThenVerifyDetached(
      encryptedKeyknoxValue.value,
      encryptedKeyknoxValue.meta,
      keyPair.privateKey,
      keyPair.publicKey,
    );
    expect(decryptedData.toString('base64')).to.equal(value);
  });
});

import { expect } from 'chai';
import uuid from 'uuid/v4';

import {
  initCrypto,
  VirgilCrypto,
  VirgilPrivateKey,
  VirgilPublicKey,
  VirgilKeyPair,
  VirgilAccessTokenSigner,
} from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';

import { KeyknoxCrypto } from '../cryptos/KeyknoxCrypto';
import { KeyknoxClient } from '../KeyknoxClient';
import { KeyknoxManager } from '../KeyknoxManager';

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

  function createKeyknoxManager(
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
    identity?: string,
  ): KeyknoxManager {
    const accessTokenProvider = new GeneratorJwtProvider(
      jwtGenerator,
      undefined,
      identity || uuid(),
    );
    return new KeyknoxManager(
      privateKey,
      publicKey,
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
    keyknoxManager = createKeyknoxManager(keyPair.privateKey, keyPair.publicKey);
  });

  it('KTC-6', async () => {
    const value = 'dmFsdWUK';
    const decryptedKeyknoxValue = await keyknoxManager.pushValue(value);
    expect(decryptedKeyknoxValue.value).to.equal(value);
  });

  it('KTC-7', async () => {
    const value = 'dmFsdWUK';
    await keyknoxManager.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager.pullValue();
    expect(decryptedKeyknoxValue.value).to.equal(value);
  });

  it('KTC-8', async () => {
    const decryptedKeyknoxValue = await keyknoxManager.pullValue();
    expect(decryptedKeyknoxValue.meta.length).to.equal(0);
    expect(decryptedKeyknoxValue.value.length).to.equal(0);
    expect(decryptedKeyknoxValue.version).to.equal('1.0');
  });

  it('KTC-9', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const keyPairs = generateKeyPairs(50);
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(keyPairs[0].privateKey, publicKeys, identity);
    await keyknoxManager1.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager1.pullValue();
    expect(decryptedKeyknoxValue.value).equal(value);
    publicKeys = getPublicKeys(keyPairs, 25, 50);
    const keyknoxManager2 = createKeyknoxManager(keyPairs[0].privateKey, publicKeys, identity);
    try {
      await keyknoxManager2.pullValue();
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-10', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(privateKey, publicKeys, identity);
    await keyknoxManager1.pushValue(value);
    let decryptedKeyknoxValue = await keyknoxManager1.pullValue();
    expect(decryptedKeyknoxValue.value).to.equal(value);
    privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const keyknoxManager2 = createKeyknoxManager(privateKey, publicKeys, identity);
    decryptedKeyknoxValue = await keyknoxManager2.pullValue();
    expect(decryptedKeyknoxValue.value).to.equal(value);
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    const keyknoxManager3 = createKeyknoxManager(privateKey, publicKeys, identity);
    try {
      await keyknoxManager3.pullValue();
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-11', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(privateKey, publicKeys, identity);
    await keyknoxManager1.pushValue(value);
    const keyknoxManager2 = createKeyknoxManager(privateKey, publicKeys, identity);
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 25, 50);
    let decryptedKeyknoxValue = await keyknoxManager2.updateRecipients({
      newPrivateKey: privateKey,
      newPublicKeys: publicKeys,
    });
    expect(keyknoxManager2.privateKey).to.equal(privateKey);
    expect(keyknoxManager2.publicKeys).to.equal(publicKeys);
    expect(decryptedKeyknoxValue.value).to.equal(value);
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    const keyknoxManager3 = createKeyknoxManager(privateKey, publicKeys, identity);
    decryptedKeyknoxValue = await keyknoxManager3.pullValue();
    expect(decryptedKeyknoxValue.value).to.equal(value);
    privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const keyknoxManager4 = createKeyknoxManager(privateKey, publicKeys, identity);
    try {
      await keyknoxManager4.pullValue();
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager5 = createKeyknoxManager(privateKey, publicKeys, identity);
    try {
      await keyknoxManager5.pullValue();
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-12', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const updatedValue = 'dXBkYXRlZFZhbHVl';
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager1 = createKeyknoxManager(privateKey, publicKeys, identity);
    let decryptedKeyknoxValue = await keyknoxManager1.pushValue(value);
    const keyknoxManager2 = createKeyknoxManager(privateKey, publicKeys, identity);
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 25, 50);
    decryptedKeyknoxValue = await keyknoxManager2.updateValue({
      value: updatedValue,
      previousHash: decryptedKeyknoxValue.keyknoxHash,
      newPrivateKey: privateKey,
      newPublicKeys: publicKeys,
    });
    expect(keyknoxManager2.privateKey).to.equal(privateKey);
    expect(keyknoxManager2.publicKeys).to.equal(publicKeys);
    expect(decryptedKeyknoxValue.value).to.equal(value);
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    const keyknoxManager3 = createKeyknoxManager(privateKey, publicKeys, identity);
    decryptedKeyknoxValue = await keyknoxManager3.pullValue();
    expect(decryptedKeyknoxValue.value).to.equal(value);
    privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const keyknoxManager4 = createKeyknoxManager(privateKey, publicKeys, identity);
    try {
      await keyknoxManager4.pullValue();
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
    privateKey = keyPairs[getRandomInRange(25, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager5 = createKeyknoxManager(privateKey, publicKeys, identity);
    try {
      await keyknoxManager5.pullValue();
    } catch (error) {
      expect(error).not.to.be.undefined;
    }
  });

  it('KTC-13', async () => {
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[0].privateKey;
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager = createKeyknoxManager(privateKey, publicKeys);
    privateKey = keyPairs[24].privateKey;
    publicKeys = getPublicKeys(keyPairs, 25, 50);
    const decryptedKeyknoxValue = await keyknoxManager.updateRecipients({
      newPrivateKey: privateKey,
      newPublicKeys: publicKeys,
    });
    expect(decryptedKeyknoxValue.meta.length).to.equal(0);
    expect(decryptedKeyknoxValue.value.length).to.equal(0);
    expect(decryptedKeyknoxValue.version).to.equal('1.0');
  });

  it('KTC-14', async () => {
    const value = 'dmFsdWUK';
    await keyknoxManager.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager.resetValue();
    expect(decryptedKeyknoxValue.version).to.equal('2.0');
  });

  it('KTC-15', async () => {
    const identity = uuid();
    const value = 'dmFsdWUK';
    const [keyPair1, keyPair2] = generateKeyPairs(2);
    const keyknoxManager1 = createKeyknoxManager(keyPair1.privateKey, keyPair1.publicKey, identity);
    const keyknoxManager2 = createKeyknoxManager(keyPair2.privateKey, keyPair2.publicKey, identity);
    await keyknoxManager1.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager2.resetValue();
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
    const keyknoxManager = new KeyknoxManager(
      keyPair.privateKey,
      keyPair.publicKey,
      new KeyknoxCrypto(virgilCrypto),
      keyknoxClient,
    );
    const value = 'dmFsdWUK';
    await keyknoxManager.pushValue(value);
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

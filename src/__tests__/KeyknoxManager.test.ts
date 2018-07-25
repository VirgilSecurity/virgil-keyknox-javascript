import {
  VirgilKeyPair,
  VirgilPrivateKey,
  VirgilPublicKey,
  VirgilCrypto,
  VirgilAccessTokenSigner,
} from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import KeyknoxClient from '../clients/KeyknoxClient';
import KeyknoxManager from '../KeyknoxManager';

function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateKeyPairs(amount: number) {
  const virgilCrypto = new VirgilCrypto();
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
  const virgilCrypto = new VirgilCrypto();
  const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
  const apiKey = virgilCrypto.importPrivateKey(process.env.API_KEY!);
  const jwtGenerator = new JwtGenerator({
    apiKey,
    appId: process.env.APP_ID!,
    apiKeyId: process.env.API_KEY_ID!,
    accessTokenSigner: virgilAccessTokenSigner,
  });
  const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, identity || uuid());
  return new KeyknoxManager(accessTokenProvider, privateKey, publicKey);
}

describe('KeyknoxManager', () => {
  let keyknoxManager: KeyknoxManager;
  let keyPair: VirgilKeyPair;

  beforeEach(() => {
    const virgilCrypto = new VirgilCrypto();
    keyPair = virgilCrypto.generateKeys();
    keyknoxManager = createKeyknoxManager(keyPair.privateKey, keyPair.publicKey);
  });

  test('KTC-6', async () => {
    const value = Buffer.from('value');
    expect.assertions(1);
    const decryptedKeyknoxValue = await keyknoxManager.pushValue(value);
    expect(decryptedKeyknoxValue.value).toEqual(value);
  });

  test('KTC-7', async () => {
    const value = Buffer.from('value');
    expect.assertions(1);
    await keyknoxManager.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager.pullValue();
    expect(decryptedKeyknoxValue.value).toEqual(value);
  });

  test('KTC-8', async () => {
    expect.assertions(3);
    const decryptedKeyknoxValue = await keyknoxManager.pullValue();
    expect(decryptedKeyknoxValue.meta.byteLength).toBe(0);
    expect(decryptedKeyknoxValue.value.byteLength).toBe(0);
    expect(decryptedKeyknoxValue.version).toBe('1.0');
  });

  test('KTC-9', async () => {
    const identity = uuid();
    const value = Buffer.from('value');
    const keyPairs = generateKeyPairs(50);
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    expect.assertions(2);
    const keyknoxManager1 = createKeyknoxManager(keyPairs[0].privateKey, publicKeys, identity);
    await keyknoxManager1.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager1.pullValue();
    expect(decryptedKeyknoxValue.value).toEqual(value);
    publicKeys = getPublicKeys(keyPairs, 24, 50);
    const keyknoxManager2 = createKeyknoxManager(keyPairs[0].privateKey, publicKeys, identity);
    await expect(keyknoxManager2.pullValue()).rejects.toThrow();
  });

  test('KTC-10', async () => {
    const identity = uuid();
    const value = Buffer.from('value');
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const publicKeys = getPublicKeys(keyPairs, 0, 25);
    expect.assertions(3);
    const keyknoxManager1 = createKeyknoxManager(privateKey, publicKeys, identity);
    await keyknoxManager1.pushValue(value);
    let decryptedKeyknoxValue = await keyknoxManager1.pullValue();
    expect(decryptedKeyknoxValue.value).toEqual(value);
    privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const keyknoxManager2 = createKeyknoxManager(privateKey, publicKeys, identity);
    decryptedKeyknoxValue = await keyknoxManager2.pullValue();
    expect(decryptedKeyknoxValue.value).toEqual(value);
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    const keyknoxManager3 = createKeyknoxManager(privateKey, publicKeys, identity);
    await expect(keyknoxManager3.pullValue()).rejects.toThrow();
  });

  test('KTC-11', async () => {
    const identity = uuid();
    const value = Buffer.from('value');
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    expect.assertions(6);
    const keyknoxManager1 = createKeyknoxManager(privateKey, publicKeys, identity);
    await keyknoxManager1.pushValue(value);
    const keyknoxManager2 = createKeyknoxManager(privateKey, publicKeys, identity);
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 24, 50);
    let decryptedKeyknoxValue = await keyknoxManager2.updateRecipients({
      newPrivateKey: privateKey,
      newPublicKey: publicKeys,
    });
    expect(keyknoxManager2.privateKey).toBe(privateKey);
    expect(keyknoxManager2.publicKey).toBe(publicKeys);
    expect(decryptedKeyknoxValue.value).toEqual(value);
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    const keyknoxManager3 = createKeyknoxManager(privateKey, publicKeys, identity);
    decryptedKeyknoxValue = await keyknoxManager3.pullValue();
    expect(decryptedKeyknoxValue.value).toEqual(value);
    privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const keyknoxManager4 = createKeyknoxManager(privateKey, publicKeys, identity);
    await expect(keyknoxManager4.pullValue()).rejects.toThrow();
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager5 = createKeyknoxManager(privateKey, publicKeys, identity);
    await expect(keyknoxManager5.pullValue()).rejects.toThrow();
  });

  test('KTC-12', async () => {
    const identity = uuid();
    const value = Buffer.from('value');
    const updatedValue = Buffer.from('updatedValue');
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    expect.assertions(6);
    const keyknoxManager1 = createKeyknoxManager(privateKey, publicKeys, identity);
    let decryptedKeyknoxValue = await keyknoxManager1.pushValue(value);
    const keyknoxManager2 = createKeyknoxManager(privateKey, publicKeys, identity);
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 24, 50);
    decryptedKeyknoxValue = await keyknoxManager2.updateRecipients({
      value: updatedValue,
      previousHash: decryptedKeyknoxValue.keyknoxHash,
      newPrivateKey: privateKey,
      newPublicKey: publicKeys,
    });
    expect(keyknoxManager2.privateKey).toBe(privateKey);
    expect(keyknoxManager2.publicKey).toBe(publicKeys);
    expect(decryptedKeyknoxValue.value).toEqual(value);
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    const keyknoxManager3 = createKeyknoxManager(privateKey, publicKeys, identity);
    decryptedKeyknoxValue = await keyknoxManager3.pullValue();
    expect(decryptedKeyknoxValue.value).toEqual(value);
    privateKey = keyPairs[getRandomInRange(0, 25)].privateKey;
    const keyknoxManager4 = createKeyknoxManager(privateKey, publicKeys, identity);
    await expect(keyknoxManager4.pullValue()).rejects.toThrow();
    privateKey = keyPairs[getRandomInRange(24, 50)].privateKey;
    publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager5 = createKeyknoxManager(privateKey, publicKeys, identity);
    await expect(keyknoxManager5.pullValue()).rejects.toThrow();
  });

  test('KTC-13', async () => {
    const keyPairs = generateKeyPairs(50);
    let privateKey = keyPairs[0].privateKey;
    let publicKeys = getPublicKeys(keyPairs, 0, 25);
    const keyknoxManager = createKeyknoxManager(privateKey, publicKeys);
    privateKey = keyPairs[24].privateKey;
    publicKeys = getPublicKeys(keyPairs, 24, 50);
    expect.assertions(3);
    const decryptedKeyknoxValue = await keyknoxManager.updateRecipients({
      newPrivateKey: privateKey,
      newPublicKey: publicKeys,
    });
    expect(decryptedKeyknoxValue.meta.byteLength).toBe(0);
    expect(decryptedKeyknoxValue.value.byteLength).toBe(0);
    expect(decryptedKeyknoxValue.version).toBe('1.0');
  });

  test('KTC-14', async () => {
    const value = Buffer.from('value');
    expect.assertions(1);
    await keyknoxManager.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager.resetValue();
    expect(decryptedKeyknoxValue.version).toBe('2.0');
  });

  test('KTC-15', async () => {
    const identity = uuid();
    const value = Buffer.from('value');
    const [keyPair1, keyPair2] = generateKeyPairs(2);
    const keyknoxManager1 = createKeyknoxManager(keyPair1.privateKey, keyPair1.publicKey, identity);
    const keyknoxManager2 = createKeyknoxManager(keyPair2.privateKey, keyPair2.publicKey, identity);
    expect.assertions(1);
    await keyknoxManager1.pushValue(value);
    const decryptedKeyknoxValue = await keyknoxManager2.resetValue();
    expect(decryptedKeyknoxValue.version).toBe('2.0');
  });

  test('KTC-16', async () => {
    const virgilCrypto = new VirgilCrypto();
    const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
    const apiKey = virgilCrypto.importPrivateKey(process.env.API_KEY!);
    const jwtGenerator = new JwtGenerator({
      apiKey,
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: virgilAccessTokenSigner,
    });
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, uuid());
    const [keyPair] = generateKeyPairs(1);
    const keyknoxClient = new KeyknoxClient();
    const keyknoxManager = new KeyknoxManager(
      accessTokenProvider,
      keyPair.privateKey,
      keyPair.publicKey,
      keyknoxClient,
    );
    const value = Buffer.from('value');
    expect.assertions(1);
    await keyknoxManager.pushValue(value);
    const token = await accessTokenProvider.getToken({ operation: 'get' });
    const encryptedKeyknoxValue = await keyknoxClient.pullValue(token.toString());
    const decryptedData = virgilCrypto.decryptThenVerifyDetached(
      encryptedKeyknoxValue.value,
      encryptedKeyknoxValue.meta,
      keyPair.privateKey,
      keyPair.publicKey,
    );
    expect(decryptedData).toEqual(value);
  });
});

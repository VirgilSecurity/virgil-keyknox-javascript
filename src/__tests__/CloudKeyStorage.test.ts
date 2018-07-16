import { VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import CloudKeyStorage from '../CloudKeyStorage';
import { CloudEntry, KeyEntry } from '../entities';
import KeyknoxManager from '../KeyknoxManager';

function generateKeyEntries(amount: number): KeyEntry[] {
  const keyEntries = [];
  for (let i = 0; i < amount; i += 1) {
    keyEntries.push({
      name: `entry${i}`,
      data: new Buffer(`data${i}`),
      meta: { meta: `meta${i}` },
    });
  }
  return keyEntries;
}

describe('CloudKeyStorage', () => {
  let cloudKeyStorage: CloudKeyStorage;

  beforeEach(() => {
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
    const keyPair = virgilCrypto.generateKeys();
    const keyknoxManager = new KeyknoxManager(
      accessTokenProvider,
      keyPair.privateKey,
      keyPair.publicKey,
    );
    cloudKeyStorage = new CloudKeyStorage(keyknoxManager);
  });

  test('KTC-19', async () => {
    expect.assertions(1);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
  });

  test('KTC-20', async () => {
    expect.assertions(6);
    await cloudKeyStorage.retrieveCloudEntries();
    const name = 'name';
    const data = Buffer.from('data');
    const meta = { meta: 'meta' };
    await cloudKeyStorage.storeEntry(name, data, meta);
    let cloudEntry = cloudKeyStorage.retrieveEntry(name);
    expect(cloudEntry.name).toBe(name);
    expect(cloudEntry.data).toEqual(data);
    expect(cloudEntry.meta).toEqual(meta);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntry = cloudKeyStorage.retrieveEntry(name);
    expect(cloudEntry.name).toBe(name);
    expect(cloudEntry.data).toEqual(data);
    expect(cloudEntry.meta).toEqual(meta);
  });

  test('KTC-21', async () => {
    expect.assertions(4);
    await cloudKeyStorage.retrieveCloudEntries();
    const name = 'name';
    const data = Buffer.from('data');
    const meta = { meta: 'meta' };
    await cloudKeyStorage.storeEntry(name, data, meta);
    expect(cloudKeyStorage.existsEntry(name)).toBeTruthy();
    expect(cloudKeyStorage.existsEntry('name1')).toBeFalsy();
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.existsEntry(name)).toBeTruthy();
    expect(cloudKeyStorage.existsEntry('name1')).toBeFalsy();
  });

  test('KTC-22', async () => {
    const compareAssertions = 3;
    function compare(cloudEntries: CloudEntry[], keyEntries: { [key: string]: KeyEntry }): void {
      cloudEntries.forEach(cloudEntry => {
        const keyEntry = keyEntries[cloudEntry.name];
        expect(keyEntry).toBeDefined();
        expect(cloudEntry.data).toEqual(keyEntry.data);
        expect(cloudEntry.meta).toEqual(keyEntry.meta);
      });
    }

    const keyEntries = generateKeyEntries(100);
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});
    expect.assertions(4 + 2 * 99 * compareAssertions + 2 * 100 * compareAssertions);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntries[0].name, keyEntries[0].data, keyEntries[0].meta);
    const keyEntries98 = keyEntries.slice(1, 99);
    await cloudKeyStorage.storeEntries(keyEntries98);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.storeEntry(keyEntries[99].name, keyEntries[99].data, keyEntries[99].meta);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(100);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(100);
    compare(cloudEntries, keyEntriesMap);
  });

  test('KTC-23', async () => {
    const keyEntries = generateKeyEntries(100);
    expect.assertions(2);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteAllEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
  });

  test('KTC-24', async () => {
    expect.assertions(2);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.deleteAllEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
  });

  test('KTC-25', async () => {
    const keyEntries = generateKeyEntries(10);
    const firstName = keyEntries[0].name;
    const secondName = keyEntries[1].name;
    const thirdName = keyEntries[2].name;
    expect.assertions(10);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteEntry(firstName);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(firstName)).toBeFalsy();
    expect(cloudEntries.length).toBe(9);
    await cloudKeyStorage.deleteEntries([secondName, thirdName]);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(firstName)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(secondName)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(thirdName)).toBeFalsy();
    expect(cloudEntries.length).toBe(7);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(firstName)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(secondName)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(thirdName)).toBeFalsy();
    expect(cloudEntries.length).toBe(7);
  });

  test('KTC-26', async () => {
    const keyEntries = generateKeyEntries(10);
    const firstName = keyEntries[0].name;
    const newData = Buffer.from('newData');
    const newMeta = { meta: 'newMeta' };
    expect.assertions(6);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.updateEntry(firstName, newData, newMeta);
    let cloudEntry = cloudKeyStorage.retrieveEntry(firstName);
    expect(cloudEntry.name).toBe(firstName);
    expect(cloudEntry.data).toEqual(newData);
    expect(cloudEntry.meta).toEqual(newMeta);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntry = cloudKeyStorage.retrieveEntry(firstName);
    expect(cloudEntry.name).toBe(firstName);
    expect(cloudEntry.data).toEqual(newData);
    expect(cloudEntry.meta).toEqual(newMeta);
  });

  test('KTC-27', async () => {
    const keyEntries = generateKeyEntries(10);
    expect.assertions(2);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(keyEntries.length);
    const virgilCrypto = new VirgilCrypto();
    const keyPair = virgilCrypto.generateKeys();
    await cloudKeyStorage.updateRecipients(keyPair.privateKey, keyPair.publicKey);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(keyEntries.length);
  });

  test('KTC-28', async () => {
    const keyEntries = generateKeyEntries(10);
    const virgilCrypto = new VirgilCrypto();
    const keyPair = virgilCrypto.generateKeys();
    const error1 = () => cloudKeyStorage.retrieveAllEntries();
    const error2 = () => cloudKeyStorage.retrieveEntry('name');
    const error3 = () => cloudKeyStorage.existsEntry('name');
    expect.assertions(9);
    expect(error1).toThrow();
    expect(error2).toThrow();
    expect(error3).toThrow();
    expect(
      cloudKeyStorage.storeEntry(keyEntries[0].name, keyEntries[0].data, keyEntries[0].meta),
    ).rejects.toThrow();
    expect(cloudKeyStorage.storeEntries(keyEntries)).rejects.toThrow();
    expect(
      cloudKeyStorage.updateEntry(keyEntries[0].name, keyEntries[0].data, keyEntries[0].meta),
    ).rejects.toThrow();
    expect(cloudKeyStorage.deleteEntry(keyEntries[0].name)).rejects.toThrow();
    expect(
      cloudKeyStorage.deleteEntries([keyEntries[0].name, keyEntries[1].name]),
    ).rejects.toThrow();
    expect(
      cloudKeyStorage.updateRecipients(keyPair.privateKey, keyPair.publicKey),
    ).rejects.toThrow();
  });
});

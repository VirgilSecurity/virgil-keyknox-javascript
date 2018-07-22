import { VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import CloudKeyStorage from '../CloudKeyStorage';
import { CloudEntry, KeyEntry } from '../entities';

function generateKeyEntries(amount: number): KeyEntry[] {
  const keyEntries = [];
  for (let i = 0; i < amount; i += 1) {
    keyEntries.push({
      name: uuid(),
      data: Buffer.from(`data${i}`),
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
    cloudKeyStorage = CloudKeyStorage.create(
      accessTokenProvider,
      keyPair.privateKey,
      keyPair.publicKey,
    );
  });

  test('KTC-19', async () => {
    expect.assertions(1);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
  });

  test('KTC-20', async () => {
    const [keyEntry] = generateKeyEntries(1);
    expect.assertions(6);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry.name, keyEntry.data, keyEntry.meta);
    let cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    expect(cloudEntry.name).toBe(keyEntry.name);
    expect(cloudEntry.data).toEqual(keyEntry.data);
    expect(cloudEntry.meta).toEqual(keyEntry.meta);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    expect(cloudEntry.name).toBe(keyEntry.name);
    expect(cloudEntry.data).toEqual(keyEntry.data);
    expect(cloudEntry.meta).toEqual(keyEntry.meta);
  });

  test('KTC-21', async () => {
    const [keyEntry] = generateKeyEntries(1);
    expect.assertions(4);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry.name, keyEntry.data, keyEntry.meta);
    expect(cloudKeyStorage.existsEntry(keyEntry.name)).toBeTruthy();
    expect(cloudKeyStorage.existsEntry('name1')).toBeFalsy();
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry.name)).toBeTruthy();
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
    const [keyEntry1] = keyEntries;
    const lastEntry = keyEntries[99];
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});
    expect.assertions(4 + 2 * 99 * compareAssertions + 2 * 100 * compareAssertions);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    const keyEntries98 = keyEntries.slice(1, 99);
    await cloudKeyStorage.storeEntries(keyEntries98);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries.length).toBe(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.storeEntry(lastEntry.name, lastEntry.data, lastEntry.meta);
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
    const [keyEntry1, keyEntry2, keyEntry3] = keyEntries;
    expect.assertions(10);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteEntry(keyEntry1.name);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).toBeFalsy();
    expect(cloudEntries.length).toBe(9);
    await cloudKeyStorage.deleteEntries([keyEntry2.name, keyEntry3.name]);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry2.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry3.name)).toBeFalsy();
    expect(cloudEntries.length).toBe(7);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry2.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry3.name)).toBeFalsy();
    expect(cloudEntries.length).toBe(7);
  });

  test('KTC-26', async () => {
    const keyEntries = generateKeyEntries(10);
    const updatedKeyEntry = {
      ...keyEntries[0],
      data: Buffer.from('newData'),
      meta: { meta: 'newMeta' },
    };
    expect.assertions(6);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.updateEntry(
      updatedKeyEntry.name,
      updatedKeyEntry.data,
      updatedKeyEntry.meta,
    );
    let cloudEntry = cloudKeyStorage.retrieveEntry(updatedKeyEntry.name);
    expect(cloudEntry.name).toBe(updatedKeyEntry.name);
    expect(cloudEntry.data).toEqual(updatedKeyEntry.data);
    expect(cloudEntry.meta).toEqual(updatedKeyEntry.meta);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntry = cloudKeyStorage.retrieveEntry(updatedKeyEntry.name);
    expect(cloudEntry.name).toBe(updatedKeyEntry.name);
    expect(cloudEntry.data).toEqual(updatedKeyEntry.data);
    expect(cloudEntry.meta).toEqual(updatedKeyEntry.meta);
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
    const [keyEntry1, keyEntry2] = keyEntries;
    const virgilCrypto = new VirgilCrypto();
    const keyPair = virgilCrypto.generateKeys();
    const error1 = () => cloudKeyStorage.retrieveAllEntries();
    const error2 = () => cloudKeyStorage.retrieveEntry('name');
    const error3 = () => cloudKeyStorage.existsEntry('name');
    expect.assertions(9);
    expect(error1).toThrow();
    expect(error2).toThrow();
    expect(error3).toThrow();
    await expect(
      cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta),
    ).rejects.toThrow();
    await expect(cloudKeyStorage.storeEntries(keyEntries)).rejects.toThrow();
    await expect(
      cloudKeyStorage.updateEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta),
    ).rejects.toThrow();
    await expect(cloudKeyStorage.deleteEntry(keyEntry1.name)).rejects.toThrow();
    await expect(cloudKeyStorage.deleteEntries([keyEntry1.name, keyEntry2.name])).rejects.toThrow();
    await expect(
      cloudKeyStorage.updateRecipients(keyPair.privateKey, keyPair.publicKey),
    ).rejects.toThrow();
  });
});

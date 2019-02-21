import {
  VirgilCrypto,
  VirgilAccessTokenSigner,
  VirgilPublicKey,
  VirgilPrivateKey,
} from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import {
  CloudKeyStorageOutOfSyncError,
  CloudEntryExistsError,
  CloudEntryDoesntExistError,
} from '../errors';
import CloudKeyStorage from '../CloudKeyStorage';
import { CloudEntry, KeyEntry } from '../entities';
import KeyknoxManager from '../KeyknoxManager';

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
  let accessTokenProvider: GeneratorJwtProvider;
  let keyPair: {
    publicKey: VirgilPublicKey;
    privateKey: VirgilPrivateKey;
  };

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
    accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, uuid());
    keyPair = virgilCrypto.generateKeys();
    cloudKeyStorage = CloudKeyStorage.create({
      accessTokenProvider,
      privateKey: keyPair.privateKey,
      publicKeys: keyPair.publicKey,
    });
  });

  test('KTC-19', async () => {
    expect.assertions(1);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries().length).toBe(0);
  });

  test('KTC-20', async () => {
    expect.assertions(6);
    const [keyEntry] = generateKeyEntries(1);
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
    expect.assertions(4);
    const [keyEntry] = generateKeyEntries(1);
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
    expect(cloudEntries).toHaveLength(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).toHaveLength(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.storeEntry(lastEntry.name, lastEntry.data, lastEntry.meta);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).toHaveLength(100);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).toHaveLength(100);
    compare(cloudEntries, keyEntriesMap);
  });

  test('KTC-23', async () => {
    expect.assertions(2);
    const keyEntries = generateKeyEntries(100);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteAllEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).toHaveLength(0);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).toHaveLength(0);
  });

  test('KTC-24', async () => {
    expect.assertions(2);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.deleteAllEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).toHaveLength(0);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).toHaveLength(0);
  });

  test('KTC-25', async () => {
    expect.assertions(10);
    const keyEntries = generateKeyEntries(10);
    const [keyEntry1, keyEntry2, keyEntry3] = keyEntries;
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteEntry(keyEntry1.name);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).toBeFalsy();
    expect(cloudEntries).toHaveLength(9);
    await cloudKeyStorage.deleteEntries([keyEntry2.name, keyEntry3.name]);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry2.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry3.name)).toBeFalsy();
    expect(cloudEntries).toHaveLength(7);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry2.name)).toBeFalsy();
    expect(cloudKeyStorage.existsEntry(keyEntry3.name)).toBeFalsy();
    expect(cloudEntries).toHaveLength(7);
  });

  test('KTC-26', async () => {
    expect.assertions(6);
    const keyEntries = generateKeyEntries(10);
    const updatedKeyEntry = {
      ...keyEntries[0],
      data: Buffer.from('newData'),
      meta: { meta: 'newMeta' },
    };
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
    expect.assertions(2);
    const keyEntries = generateKeyEntries(10);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).toHaveLength(keyEntries.length);
    const virgilCrypto = new VirgilCrypto();
    const { privateKey: newPrivateKey, publicKey: newPublicKey } = virgilCrypto.generateKeys();
    await cloudKeyStorage.updateRecipients({
      newPrivateKey,
      newPublicKeys: newPublicKey,
    });
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).toHaveLength(keyEntries.length);
  });

  test('KTC-28', async () => {
    expect.assertions(9);
    const keyEntries = generateKeyEntries(10);
    const [keyEntry1, keyEntry2] = keyEntries;
    const virgilCrypto = new VirgilCrypto();
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const error1 = () => cloudKeyStorage.retrieveAllEntries();
    const error2 = () => cloudKeyStorage.retrieveEntry('name');
    const error3 = () => cloudKeyStorage.existsEntry('name');
    expect(error1).toThrow(CloudKeyStorageOutOfSyncError);
    expect(error2).toThrow(CloudKeyStorageOutOfSyncError);
    expect(error3).toThrow(CloudKeyStorageOutOfSyncError);
    await expect(
      cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta),
    ).rejects.toThrow(CloudKeyStorageOutOfSyncError);
    await expect(cloudKeyStorage.storeEntries(keyEntries)).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    await expect(
      cloudKeyStorage.updateEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta),
    ).rejects.toThrow(CloudKeyStorageOutOfSyncError);
    await expect(cloudKeyStorage.deleteEntry(keyEntry1.name)).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    await expect(cloudKeyStorage.deleteEntries([keyEntry1.name, keyEntry2.name])).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    await expect(
      cloudKeyStorage.updateRecipients({ newPrivateKey: privateKey, newPublicKeys: publicKey }),
    ).rejects.toThrow(CloudKeyStorageOutOfSyncError);
  });

  test('KTC-41', async () => {
    expect.assertions(1);
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
    await keyknoxManager.pushValue(Buffer.from(uuid()));
    await cloudKeyStorage.deleteAllEntries();
    await cloudKeyStorage.retrieveCloudEntries();
    const entries = cloudKeyStorage.retrieveAllEntries();
    expect(entries).toHaveLength(0);
  });

  it("should throw 'CloudEntryExistsError' if we try to store entry with name that's already in use", async () => {
    expect.assertions(2);
    const [keyEntry1, keyEntry2] = generateKeyEntries(2);
    keyEntry2.name = keyEntry1.name;
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    await expect(cloudKeyStorage.storeEntries([keyEntry2])).rejects.toThrow(CloudEntryExistsError);
    await expect(
      cloudKeyStorage.storeEntry(keyEntry2.name, keyEntry2.data, keyEntry2.meta),
    ).rejects.toThrow(CloudEntryExistsError);
  });

  it("should throw 'CloudEntryDoesntExistError' if we try to retrieve non-existent entry", async () => {
    expect.assertions(1);
    await cloudKeyStorage.retrieveCloudEntries();
    const retrieve = () => cloudKeyStorage.retrieveEntry('123');
    expect(retrieve).toThrow(CloudEntryDoesntExistError);
  });

  it("should throw 'CloudEntryDoesntExistError' if we try to delete non-existent entry", async () => {
    expect.assertions(2);
    await cloudKeyStorage.retrieveCloudEntries();
    await expect(cloudKeyStorage.deleteEntry('123')).rejects.toThrow(CloudEntryDoesntExistError);
    await expect(cloudKeyStorage.deleteEntries(['123', '456'])).rejects.toThrow(
      CloudEntryDoesntExistError,
    );
  });
});

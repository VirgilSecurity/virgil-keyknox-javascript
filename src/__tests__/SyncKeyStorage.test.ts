import { join } from 'path';
import { VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import {
  IKeyEntry,
  IKeyEntryStorage,
  KeyEntryStorage,
  JwtGenerator,
  GeneratorJwtProvider,
} from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import CloudKeyStorage from '../CloudKeyStorage';
import { KeyEntry } from '../entities';
import {
  CloudKeyStorageOutOfSyncError,
  KeyEntryExistsError,
  KeyEntryDoesntExistError,
} from '../errors';
import KeyEntryStorageWrapper from '../KeyEntryStorageWrapper';
import KeyknoxManager from '../KeyknoxManager';
import SyncKeyStorage from '../SyncKeyStorage';

function generateKeyEntries(amount: number): KeyEntry[] {
  const keyEntries = [];
  for (let i = 0; i < amount; i += 1) {
    keyEntries.push({ name: uuid(), data: Buffer.from('data') });
  }
  return keyEntries;
}

describe('SyncKeyStorage', () => {
  let keyknoxManager: KeyknoxManager;
  let cloudKeyStorage: CloudKeyStorage;
  let keyEntryStorageWrapper: KeyEntryStorageWrapper;
  let syncKeyStorage: SyncKeyStorage;

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
    const identity = uuid();
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, identity);
    const keyPair = virgilCrypto.generateKeys();
    const keyEntryStorage = new KeyEntryStorage(join(process.env.KEY_ENTRIES_FOLDER!, identity));
    keyknoxManager = new KeyknoxManager(accessTokenProvider, keyPair.privateKey, keyPair.publicKey);
    cloudKeyStorage = new CloudKeyStorage(keyknoxManager);
    keyEntryStorageWrapper = new KeyEntryStorageWrapper(identity, keyEntryStorage);
    syncKeyStorage = new SyncKeyStorage(identity, cloudKeyStorage, keyEntryStorage);
  });

  test('KTC-29', async () => {
    const compareAssertions = 2;
    function compare(storedKeyEntry: IKeyEntry, keyEntry: KeyEntry): void {
      expect(storedKeyEntry.name).toBe(keyEntry.name);
      expect(storedKeyEntry.value).toEqual(keyEntry.data);
    }

    const keyEntries = generateKeyEntries(2);
    const [keyEntry1, keyEntry2] = keyEntries;
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});
    expect.assertions(7 + 7 * compareAssertions);

    await syncKeyStorage.sync();
    let storedKeyEntries = await keyEntryStorageWrapper.list();
    expect(storedKeyEntries.length).toBe(0);

    await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    let [storedKeyEntry1, storedKeyEntry2] = storedKeyEntries;
    expect(storedKeyEntries.length).toBe(1);
    compare(storedKeyEntry1, keyEntriesMap[storedKeyEntry1.name]);

    await cloudKeyStorage.storeEntry(keyEntry2.name, keyEntry2.data);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1, storedKeyEntry2] = storedKeyEntries;
    expect(storedKeyEntries.length).toBe(2);
    compare(storedKeyEntry1, keyEntriesMap[storedKeyEntry1.name]);
    compare(storedKeyEntry2, keyEntriesMap[storedKeyEntry2.name]);

    await keyEntryStorageWrapper.remove(keyEntry1.name);
    await keyEntryStorageWrapper.remove(keyEntry2.name);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1, storedKeyEntry2] = storedKeyEntries;
    expect(storedKeyEntries.length).toBe(2);
    compare(storedKeyEntry1, keyEntriesMap[storedKeyEntry1.name]);
    compare(storedKeyEntry2, keyEntriesMap[storedKeyEntry2.name]);

    await cloudKeyStorage.deleteEntry(keyEntry1.name);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1] = storedKeyEntries;
    expect(storedKeyEntries.length).toBe(1);
    compare(storedKeyEntry1, keyEntry2);

    const updatedEntry = { name: keyEntry2.name, data: Buffer.from('newData') };
    await cloudKeyStorage.updateEntry(updatedEntry.name, updatedEntry.data);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1] = storedKeyEntries;
    expect(storedKeyEntries.length).toBe(1);
    compare(storedKeyEntry1, updatedEntry);

    await cloudKeyStorage.deleteAllEntries();
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    expect(storedKeyEntries.length).toBe(0);
  });

  test('KTC-30', async () => {
    expect.assertions(6);
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    const cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    const storageKeyEntry = await keyEntryStorageWrapper.load(keyEntry.name);
    expect(entry.name).toBe(keyEntry.name);
    expect(entry.value).toEqual(keyEntry.data);
    expect(cloudEntry.name).toBe(keyEntry.name);
    expect(cloudEntry.data).toEqual(keyEntry.data);
    expect(storageKeyEntry!.name).toBe(keyEntry.name);
    expect(storageKeyEntry!.value).toEqual(keyEntry.data);
  });

  test('KTC-31', async () => {
    expect.assertions(3);
    const keyEntries = generateKeyEntries(2);
    const [keyEntry1] = keyEntries;
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    await syncKeyStorage.deleteEntry(keyEntry1.name);
    const entries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(entries).toHaveLength(1);
    expect(cloudEntries).toHaveLength(1);
    expect(storageKeyEntries).toHaveLength(1);
  });

  test('KTC-32', async () => {
    expect.assertions(6);
    const [keyEntry] = generateKeyEntries(1);
    const newData = Buffer.from('newData');
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    await syncKeyStorage.updateEntry(keyEntry.name, newData);
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    const cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    const storageKeyEntry = await keyEntryStorageWrapper.load(keyEntry.name);
    expect(entry.name).toBe(keyEntry.name);
    expect(entry.value).toEqual(newData);
    expect(cloudEntry.name).toBe(keyEntry.name);
    expect(cloudEntry.data).toEqual(newData);
    expect(storageKeyEntry!.name).toBe(keyEntry.name);
    expect(storageKeyEntry!.value).toEqual(newData);
  });

  test('KTC-33', async () => {
    expect.assertions(3);
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    const virgilCrypto = new VirgilCrypto();
    const { privateKey: newPrivateKey, publicKey: newPublicKeys } = virgilCrypto.generateKeys();
    await syncKeyStorage.updateRecipients({ newPrivateKey, newPublicKeys });
    expect(keyknoxManager.privateKey).toBe(newPrivateKey);
    expect(keyknoxManager.publicKeys).toBe(newPublicKeys);
    await syncKeyStorage.sync();
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    expect(entry).toBeDefined();
  });

  test('KTC-34', async () => {
    const totalEntries = 2;
    const keyEntries = generateKeyEntries(totalEntries);
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});
    expect.assertions(3 + 3 * 2 * 2);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    const entries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(entries).toHaveLength(totalEntries);
    entries.forEach(keyEntry => {
      const myKeyEntry = keyEntriesMap[keyEntry.name];
      expect(keyEntry.name).toBe(myKeyEntry.name);
      expect(keyEntry.value).toEqual(myKeyEntry.data);
    });
    expect(cloudEntries).toHaveLength(totalEntries);
    cloudEntries.forEach(cloudEntry => {
      const myKeyEntry = keyEntriesMap[cloudEntry.name];
      expect(cloudEntry.name).toBe(myKeyEntry.name);
      expect(cloudEntry.data).toEqual(myKeyEntry.data);
    });
    expect(storageKeyEntries).toHaveLength(totalEntries);
    storageKeyEntries.forEach(keyEntry => {
      const myKeyEntry = keyEntriesMap[keyEntry.name];
      expect(keyEntry.name).toBe(myKeyEntry.name);
      expect(keyEntry.value).toEqual(myKeyEntry.data);
    });
  });

  test('KTC-35', async () => {
    expect.assertions(6);
    const keyEntries = generateKeyEntries(3);
    const [keyEntry1, keyEntry2, keyEntry3] = keyEntries;
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    await syncKeyStorage.deleteEntries([keyEntry1.name, keyEntry2.name]);
    const keyEntry = await syncKeyStorage.retrieveEntry(keyEntry3.name);
    const cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry3.name);
    const storageKeyEntry = await keyEntryStorageWrapper.load(keyEntry3.name);
    expect(keyEntry.name).toBe(keyEntry3.name);
    expect(keyEntry.value).toEqual(keyEntry3.data);
    expect(cloudEntry.name).toBe(keyEntry3.name);
    expect(cloudEntry.data).toEqual(keyEntry3.data);
    expect(storageKeyEntry!.name).toBe(keyEntry3.name);
    expect(storageKeyEntry!.value).toEqual(keyEntry3.data);
  });

  test('KTC-36', async () => {
    expect.assertions(5);
    const keyEntries = generateKeyEntries(2);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    const myKeyEntries = keyEntries.map(keyEntry => ({
      name: keyEntry.name,
      value: Buffer.from('value'),
    }));
    const [keyEntry1, keyEntry2] = myKeyEntries;
    const myKeyEntriesMap = {
      [keyEntry1.name]: keyEntry1,
      [keyEntry2.name]: keyEntry2,
    };
    await keyEntryStorageWrapper.remove(keyEntry1.name);
    await keyEntryStorageWrapper.save(keyEntry1);
    await keyEntryStorageWrapper.remove(keyEntry2.name);
    await keyEntryStorageWrapper.save(keyEntry2);
    const entries = await syncKeyStorage.retrieveAllEntries();
    const [entry1, entry2] = entries;
    expect(entries).toHaveLength(2);
    let entry = myKeyEntriesMap[entry1.name];
    expect(entry1.name).toBe(entry.name);
    expect(entry1.value).toEqual(entry.value);
    entry = myKeyEntriesMap[entry2.name];
    expect(entry2.name).toBe(entry.name);
    expect(entry2.value).toEqual(entry.value);
  });

  test('KTC-37', async () => {
    expect.assertions(3);
    const keyEntries = generateKeyEntries(2);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    await syncKeyStorage.deleteAllEntries();
    const entries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(entries).toHaveLength(0);
    expect(cloudEntries).toHaveLength(0);
    expect(storageKeyEntries).toHaveLength(0);
  });

  test('KTC-38', async () => {
    expect.assertions(3);
    await syncKeyStorage.sync();
    await syncKeyStorage.deleteAllEntries();
    const keyEntries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(keyEntries).toHaveLength(0);
    expect(cloudEntries).toHaveLength(0);
    expect(storageKeyEntries).toHaveLength(0);
  });

  test('KTC-39', async () => {
    expect.assertions(2);
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    const exists = await syncKeyStorage.existsEntry(keyEntry.name);
    const doesntExist = await syncKeyStorage.existsEntry('keyEntry');
    expect(exists).toBeTruthy();
    expect(doesntExist).toBeFalsy();
  });

  test('KTC-40', async () => {
    expect.assertions(9);
    const keyEntry = { name: uuid(), value: Buffer.from('value') };
    await keyEntryStorageWrapper.save(keyEntry);
    await expect(syncKeyStorage.deleteEntry(keyEntry.name)).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    await expect(syncKeyStorage.deleteEntries([keyEntry.name])).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    const keyEntries = generateKeyEntries(1);
    const [keyEntry1] = keyEntries;
    await expect(syncKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data)).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    await expect(syncKeyStorage.storeEntries(keyEntries)).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    await expect(syncKeyStorage.existsEntry(keyEntry.name)).resolves.toBeTruthy();
    const entries = await syncKeyStorage.retrieveAllEntries();
    expect(entries.length).toBe(1);
    await expect(syncKeyStorage.retrieveEntry(keyEntry.name)).resolves.toBeDefined();
    await expect(syncKeyStorage.updateEntry(keyEntry.name, Buffer.from('newData'))).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
    const virgilCrypto = new VirgilCrypto();
    const { privateKey: newPrivateKey, publicKey: newPublicKeys } = virgilCrypto.generateKeys();
    await expect(syncKeyStorage.updateRecipients({ newPrivateKey, newPublicKeys })).rejects.toThrow(
      CloudKeyStorageOutOfSyncError,
    );
  });

  it("should throw 'KeyEntryExistsError' if we try to store entry with name that's already in use", async () => {
    expect.assertions(2);
    const [keyEntry1, keyEntry2] = generateKeyEntries(2);
    keyEntry2.name = keyEntry1.name;
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    await expect(
      syncKeyStorage.storeEntry(keyEntry2.name, keyEntry2.data, keyEntry2.meta),
    ).rejects.toThrow(KeyEntryExistsError);
    await expect(syncKeyStorage.storeEntries([keyEntry2])).rejects.toThrow(KeyEntryExistsError);
  });

  it("should throw 'KeyEntryDoesntExistError' if we try to retrieve non-existent entry", async () => {
    expect.assertions(1);
    await syncKeyStorage.sync();
    await expect(syncKeyStorage.retrieveEntry('123')).rejects.toThrow(KeyEntryDoesntExistError);
  });

  it("should throw 'KeyEntryDoesntExistError' if we try to update non-existent entry", async () => {
    expect.assertions(1);
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await expect(
      syncKeyStorage.updateEntry(keyEntry.name, keyEntry.data, keyEntry.meta),
    ).rejects.toThrow(KeyEntryDoesntExistError);
  });
});

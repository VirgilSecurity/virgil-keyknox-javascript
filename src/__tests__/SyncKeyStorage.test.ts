import { join } from 'path';

import { expect } from 'chai';
import uuid from 'uuid/v4';

import {
  initCrypto,
  hasFoundationModules,
  VirgilCrypto,
  VirgilAccessTokenSigner,
} from 'virgil-crypto';
import { KeyEntryStorage, JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';

import { KeyknoxClient } from '../KeyknoxClient';
import { KeyknoxCrypto } from '../KeyknoxCrypto';
import { CloudKeyStorage } from '../CloudKeyStorage';
import {
  CloudKeyStorageOutOfSyncError,
  KeyEntryExistsError,
  KeyEntryDoesntExistError,
} from '../errors';
import { KeyEntryStorageWrapper } from '../KeyEntryStorageWrapper';
import { KeyknoxManager } from '../KeyknoxManager';
import { SyncKeyStorage } from '../SyncKeyStorage';
import { IKeyEntry, KeyEntry } from '../types';

function generateKeyEntries(amount: number): KeyEntry[] {
  const keyEntries = [];
  for (let i = 0; i < amount; i += 1) {
    keyEntries.push({ name: uuid(), data: 'ZGF0YQ==' });
  }
  return keyEntries;
}

describe('SyncKeyStorage', () => {
  let keyknoxManager: KeyknoxManager;
  let cloudKeyStorage: CloudKeyStorage;
  let keyEntryStorageWrapper: KeyEntryStorageWrapper;
  let syncKeyStorage: SyncKeyStorage;

  before(async () => {
    if (!hasFoundationModules()) {
      await initCrypto();
    }
  });

  beforeEach(() => {
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
    const identity = uuid();
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, identity);
    const keyPair = virgilCrypto.generateKeys();
    const keyEntryStorage = new KeyEntryStorage(join(process.env.KEY_ENTRIES_FOLDER!, identity));
    keyknoxManager = new KeyknoxManager(
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(accessTokenProvider, process.env.API_URL),
    );
    cloudKeyStorage = new CloudKeyStorage(keyknoxManager, keyPair.privateKey, keyPair.publicKey);
    keyEntryStorageWrapper = new KeyEntryStorageWrapper(identity, keyEntryStorage);
    syncKeyStorage = new SyncKeyStorage(identity, cloudKeyStorage, keyEntryStorage);
  });

  it('KTC-29', async () => {
    function compare(storedKeyEntry: IKeyEntry, keyEntry: KeyEntry): void {
      expect(storedKeyEntry.name).to.equal(keyEntry.name);
      expect(storedKeyEntry.value).to.equal(keyEntry.data);
    }

    const keyEntries = generateKeyEntries(2);
    const [keyEntry1, keyEntry2] = keyEntries;
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});

    await syncKeyStorage.sync();
    let storedKeyEntries = await keyEntryStorageWrapper.list();
    expect(storedKeyEntries).to.have.length(0);

    await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    let [storedKeyEntry1, storedKeyEntry2] = storedKeyEntries;
    expect(storedKeyEntries).to.have.length(1);
    compare(storedKeyEntry1, keyEntriesMap[storedKeyEntry1.name]);

    await cloudKeyStorage.storeEntry(keyEntry2.name, keyEntry2.data);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1, storedKeyEntry2] = storedKeyEntries;
    expect(storedKeyEntries).to.have.length(2);
    compare(storedKeyEntry1, keyEntriesMap[storedKeyEntry1.name]);
    compare(storedKeyEntry2, keyEntriesMap[storedKeyEntry2.name]);

    await keyEntryStorageWrapper.remove(keyEntry1.name);
    await keyEntryStorageWrapper.remove(keyEntry2.name);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1, storedKeyEntry2] = storedKeyEntries;
    expect(storedKeyEntries).to.have.length(2);
    compare(storedKeyEntry1, keyEntriesMap[storedKeyEntry1.name]);
    compare(storedKeyEntry2, keyEntriesMap[storedKeyEntry2.name]);

    await cloudKeyStorage.deleteEntry(keyEntry1.name);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1] = storedKeyEntries;
    expect(storedKeyEntries).to.have.length(1);
    compare(storedKeyEntry1, keyEntry2);

    const updatedEntry = { name: keyEntry2.name, data: 'bmV3RGF0YQ==' };
    await cloudKeyStorage.updateEntry(updatedEntry.name, updatedEntry.data);
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    [storedKeyEntry1] = storedKeyEntries;
    expect(storedKeyEntries).to.have.length(1);
    compare(storedKeyEntry1, updatedEntry);

    await cloudKeyStorage.deleteAllEntries();
    await syncKeyStorage.sync();
    storedKeyEntries = await keyEntryStorageWrapper.list();
    expect(storedKeyEntries).to.have.length(0);
  });

  it('KTC-30', async () => {
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    const cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    const storageKeyEntry = await keyEntryStorageWrapper.load(keyEntry.name);
    expect(entry.name).to.equal(keyEntry.name);
    expect(entry.value).to.equal(keyEntry.data);
    expect(cloudEntry.name).to.equal(keyEntry.name);
    expect(cloudEntry.data).to.equal(keyEntry.data);
    expect(storageKeyEntry!.name).to.equal(keyEntry.name);
    expect(storageKeyEntry!.value).to.equal(keyEntry.data);
  });

  it('KTC-31', async () => {
    const keyEntries = generateKeyEntries(2);
    const [keyEntry1] = keyEntries;
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    await syncKeyStorage.deleteEntry(keyEntry1.name);
    const entries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(entries).to.have.length(1);
    expect(cloudEntries).to.have.length(1);
    expect(storageKeyEntries).to.have.length(1);
  });

  it('KTC-32', async () => {
    const [keyEntry] = generateKeyEntries(1);
    const newData = 'bmV3RGF0YQ==';
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    await syncKeyStorage.updateEntry(keyEntry.name, newData);
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    const cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    const storageKeyEntry = await keyEntryStorageWrapper.load(keyEntry.name);
    expect(entry.name).to.equal(keyEntry.name);
    expect(entry.value).to.equal(newData);
    expect(cloudEntry.name).to.equal(keyEntry.name);
    expect(cloudEntry.data).to.equal(newData);
    expect(storageKeyEntry!.name).to.equal(keyEntry.name);
    expect(storageKeyEntry!.value).to.equal(newData);
  });

  it('KTC-33', async () => {
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    const virgilCrypto = new VirgilCrypto();
    const { privateKey: newPrivateKey, publicKey: newPublicKeys } = virgilCrypto.generateKeys();
    await syncKeyStorage.updateRecipients({ newPrivateKey, newPublicKeys });
    await syncKeyStorage.sync();
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    expect(entry).not.to.be.undefined;
  });

  it('KTC-34', async () => {
    const totalEntries = 2;
    const keyEntries = generateKeyEntries(totalEntries);
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    const entries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(entries).to.have.length(totalEntries);
    entries.forEach(keyEntry => {
      const myKeyEntry = keyEntriesMap[keyEntry.name];
      expect(keyEntry.name).to.equal(myKeyEntry.name);
      expect(keyEntry.value).to.equal(myKeyEntry.data);
    });
    expect(cloudEntries).to.have.length(totalEntries);
    cloudEntries.forEach(cloudEntry => {
      const myKeyEntry = keyEntriesMap[cloudEntry.name];
      expect(cloudEntry.name).to.equal(myKeyEntry.name);
      expect(cloudEntry.data).to.equal(myKeyEntry.data);
    });
    expect(storageKeyEntries).to.have.length(totalEntries);
    storageKeyEntries.forEach(keyEntry => {
      const myKeyEntry = keyEntriesMap[keyEntry.name];
      expect(keyEntry.name).to.equal(myKeyEntry.name);
      expect(keyEntry.value).to.equal(myKeyEntry.data);
    });
  });

  it('KTC-35', async () => {
    const keyEntries = generateKeyEntries(3);
    const [keyEntry1, keyEntry2, keyEntry3] = keyEntries;
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    await syncKeyStorage.deleteEntries([keyEntry1.name, keyEntry2.name]);
    const keyEntry = await syncKeyStorage.retrieveEntry(keyEntry3.name);
    const cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry3.name);
    const storageKeyEntry = await keyEntryStorageWrapper.load(keyEntry3.name);
    expect(keyEntry.name).to.equal(keyEntry3.name);
    expect(keyEntry.value).to.equal(keyEntry3.data);
    expect(cloudEntry.name).to.equal(keyEntry3.name);
    expect(cloudEntry.data).to.equal(keyEntry3.data);
    expect(storageKeyEntry!.name).to.equal(keyEntry3.name);
    expect(storageKeyEntry!.value).to.equal(keyEntry3.data);
  });

  it('KTC-36', async () => {
    const keyEntries = generateKeyEntries(2);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    const myKeyEntries = keyEntries.map(keyEntry => ({
      name: keyEntry.name,
      value: 'dmFsdWU=',
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
    expect(entries).to.have.length(2);
    let entry = myKeyEntriesMap[entry1.name];
    expect(entry1.name).to.equal(entry.name);
    expect(entry1.value).to.equal(entry.value);
    entry = myKeyEntriesMap[entry2.name];
    expect(entry2.name).to.equal(entry.name);
    expect(entry2.value).to.equal(entry.value);
  });

  it('KTC-37', async () => {
    const keyEntries = generateKeyEntries(2);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntries(keyEntries);
    await syncKeyStorage.deleteAllEntries();
    const entries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(entries).to.have.length(0);
    expect(cloudEntries).to.have.length(0);
    expect(storageKeyEntries).to.have.length(0);
  });

  it('KTC-38', async () => {
    await syncKeyStorage.sync();
    await syncKeyStorage.deleteAllEntries();
    const keyEntries = await syncKeyStorage.retrieveAllEntries();
    const cloudEntries = cloudKeyStorage.retrieveAllEntries();
    const storageKeyEntries = await keyEntryStorageWrapper.list();
    expect(keyEntries).to.have.length(0);
    expect(cloudEntries).to.have.length(0);
    expect(storageKeyEntries).to.have.length(0);
  });

  it('KTC-39', async () => {
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry.name, keyEntry.data);
    const exists = await syncKeyStorage.existsEntry(keyEntry.name);
    const doesntExist = await syncKeyStorage.existsEntry('keyEntry');
    expect(exists).to.be.true;
    expect(doesntExist).to.be.false;
  });

  it('KTC-40', async () => {
    const keyEntry = { name: uuid(), value: 'dmFsdWU=' };
    await keyEntryStorageWrapper.save(keyEntry);
    try {
      await syncKeyStorage.deleteEntry(keyEntry.name);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await syncKeyStorage.deleteEntries([keyEntry.name]);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    const keyEntries = generateKeyEntries(1);
    const [keyEntry1] = keyEntries;
    try {
      await syncKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await syncKeyStorage.storeEntries(keyEntries);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    const exists = await syncKeyStorage.existsEntry(keyEntry.name);
    expect(exists).to.be.true;
    const entries = await syncKeyStorage.retrieveAllEntries();
    expect(entries).to.have.length(1);
    const entry = await syncKeyStorage.retrieveEntry(keyEntry.name);
    expect(entry).not.to.be.undefined;
    try {
      await syncKeyStorage.updateEntry(keyEntry.name, 'bmV3RGF0YQ==');
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    const virgilCrypto = new VirgilCrypto();
    const { privateKey: newPrivateKey, publicKey: newPublicKeys } = virgilCrypto.generateKeys();
    try {
      await syncKeyStorage.updateRecipients({ newPrivateKey, newPublicKeys });
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
  });

  it('throws `KeyEntryExistsError` if we try to store entry with name that is already in use', async () => {
    const [keyEntry1, keyEntry2] = generateKeyEntries(2);
    keyEntry2.name = keyEntry1.name;
    await syncKeyStorage.sync();
    await syncKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    try {
      await syncKeyStorage.storeEntry(keyEntry2.name, keyEntry2.data, keyEntry2.meta);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(KeyEntryExistsError);
    }
    try {
      await syncKeyStorage.storeEntries([keyEntry2]);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(KeyEntryExistsError);
    }
  });

  it('throws `KeyEntryDoesntExistError` if we try to retrieve non-existent entry', async () => {
    await syncKeyStorage.sync();
    try {
      await syncKeyStorage.retrieveEntry('123');
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(KeyEntryDoesntExistError);
    }
  });

  it('throws `KeyEntryDoesntExistError` if we try to update non-existent entry', async () => {
    const [keyEntry] = generateKeyEntries(1);
    await syncKeyStorage.sync();
    try {
      await syncKeyStorage.updateEntry(keyEntry.name, keyEntry.data, keyEntry.meta);
      expect.fail();
    } catch (error) {
      expect(error).to.be.instanceOf(KeyEntryDoesntExistError);
    }
  });
});

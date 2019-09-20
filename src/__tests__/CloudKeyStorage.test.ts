import { expect } from 'chai';

import uuid from 'uuid/v4';
import {
  initCrypto,
  VirgilCrypto,
  VirgilPublicKey,
  VirgilPrivateKey,
  VirgilAccessTokenSigner,
} from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';

import { KeyknoxCrypto } from '../KeyknoxCrypto';
import {
  CloudKeyStorageOutOfSyncError,
  CloudEntryExistsError,
  CloudEntryDoesntExistError,
} from '../errors';
import { CloudKeyStorage } from '../CloudKeyStorage';
import { KeyknoxClient } from '../KeyknoxClient';
import { KeyknoxManager } from '../KeyknoxManager';
import { CloudEntry, KeyEntry } from '../types';

function generateKeyEntries(amount: number): KeyEntry[] {
  const keyEntries = [];
  for (let i = 0; i < amount; i += 1) {
    keyEntries.push({
      name: uuid(),
      data: 'ZGF0YQ==',
      meta: { meta: 'meta' },
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

  before(async () => {
    await initCrypto();
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
    accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, uuid());
    keyPair = virgilCrypto.generateKeys();
    const keyknoxManager = new KeyknoxManager(
      keyPair.privateKey,
      keyPair.publicKey,
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(accessTokenProvider, process.env.API_URL),
    );
    cloudKeyStorage = new CloudKeyStorage(keyknoxManager);
  });

  it('KTC-19', async () => {
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).to.have.length(0);
  });

  it('KTC-20', async () => {
    const [keyEntry] = generateKeyEntries(1);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry.name, keyEntry.data, keyEntry.meta);
    let cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    expect(cloudEntry.name).to.equal(keyEntry.name);
    expect(cloudEntry.data).to.equal(keyEntry.data);
    expect(cloudEntry.meta).to.eql(keyEntry.meta);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntry = cloudKeyStorage.retrieveEntry(keyEntry.name);
    expect(cloudEntry.name).to.equal(keyEntry.name);
    expect(cloudEntry.data).to.equal(keyEntry.data);
    expect(cloudEntry.meta).to.eql(keyEntry.meta);
  });

  it('KTC-21', async () => {
    const [keyEntry] = generateKeyEntries(1);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry.name, keyEntry.data, keyEntry.meta);
    expect(cloudKeyStorage.existsEntry(keyEntry.name)).to.be.true;
    expect(cloudKeyStorage.existsEntry('name1')).to.be.false;
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry.name)).to.be.true;
    expect(cloudKeyStorage.existsEntry('name1')).to.be.false;
  });

  it('KTC-22', async () => {
    function compare(cloudEntries: CloudEntry[], keyEntries: { [key: string]: KeyEntry }): void {
      cloudEntries.forEach(cloudEntry => {
        const keyEntry = keyEntries[cloudEntry.name];
        expect(keyEntry).not.to.be.undefined;
        expect(cloudEntry.data).to.equal(keyEntry.data);
        expect(cloudEntry.meta).to.eql(keyEntry.meta);
      });
    }

    const keyEntries = generateKeyEntries(100);
    const [keyEntry1] = keyEntries;
    const lastEntry = keyEntries[99];
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: KeyEntry }>((result, keyEntry) => {
      result[keyEntry.name] = keyEntry;
      return result;
    }, {});

    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    const keyEntries98 = keyEntries.slice(1, 99);
    await cloudKeyStorage.storeEntries(keyEntries98);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).to.have.length(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).to.have.length(99);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.storeEntry(lastEntry.name, lastEntry.data, lastEntry.meta);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).to.have.length(100);
    compare(cloudEntries, keyEntriesMap);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).to.have.length(100);
    compare(cloudEntries, keyEntriesMap);
  });

  it('KTC-23', async () => {
    const keyEntries = generateKeyEntries(100);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteAllEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).to.have.length(0);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).to.have.length(0);
  });

  it('KTC-24', async () => {
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.deleteAllEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).to.have.length(0);
    await cloudKeyStorage.retrieveCloudEntries();
    expect(cloudKeyStorage.retrieveAllEntries()).to.have.length(0);
  });

  it('KTC-25', async () => {
    const keyEntries = generateKeyEntries(10);
    const [keyEntry1, keyEntry2, keyEntry3] = keyEntries;
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    await cloudKeyStorage.deleteEntry(keyEntry1.name);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).to.be.false;
    expect(cloudEntries).to.have.length(9);
    await cloudKeyStorage.deleteEntries([keyEntry2.name, keyEntry3.name]);
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).to.be.false;
    expect(cloudKeyStorage.existsEntry(keyEntry2.name)).to.be.false;
    expect(cloudKeyStorage.existsEntry(keyEntry3.name)).to.be.false;
    expect(cloudEntries).to.have.length(7);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudKeyStorage.existsEntry(keyEntry1.name)).to.be.false;
    expect(cloudKeyStorage.existsEntry(keyEntry2.name)).to.be.false;
    expect(cloudKeyStorage.existsEntry(keyEntry3.name)).to.be.false;
    expect(cloudEntries).to.have.length(7);
  });

  it('KTC-26', async () => {
    const keyEntries = generateKeyEntries(10);
    const updatedKeyEntry = {
      ...keyEntries[0],
      data: 'bmV3RGF0YQ==',
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
    expect(cloudEntry.name).to.equal(updatedKeyEntry.name);
    expect(cloudEntry.data).to.equal(updatedKeyEntry.data);
    expect(cloudEntry.meta).to.eql(updatedKeyEntry.meta);
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntry = cloudKeyStorage.retrieveEntry(updatedKeyEntry.name);
    expect(cloudEntry.name).to.equal(updatedKeyEntry.name);
    expect(cloudEntry.data).to.equal(updatedKeyEntry.data);
    expect(cloudEntry.meta).to.eql(updatedKeyEntry.meta);
  });

  it('KTC-27', async () => {
    const keyEntries = generateKeyEntries(10);
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntries(keyEntries);
    let cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).to.have.length(keyEntries.length);
    const virgilCrypto = new VirgilCrypto();
    const { privateKey: newPrivateKey, publicKey: newPublicKey } = virgilCrypto.generateKeys();
    await cloudKeyStorage.updateRecipients({
      newPrivateKey,
      newPublicKeys: newPublicKey,
    });
    await cloudKeyStorage.retrieveCloudEntries();
    cloudEntries = cloudKeyStorage.retrieveAllEntries();
    expect(cloudEntries).to.have.length(keyEntries.length);
  });

  it('KTC-28', async () => {
    const keyEntries = generateKeyEntries(10);
    const [keyEntry1, keyEntry2] = keyEntries;
    const virgilCrypto = new VirgilCrypto();
    const { privateKey, publicKey } = virgilCrypto.generateKeys();
    const error1 = () => cloudKeyStorage.retrieveAllEntries();
    const error2 = () => cloudKeyStorage.retrieveEntry('name');
    const error3 = () => cloudKeyStorage.existsEntry('name');
    expect(error1).to.throw(CloudKeyStorageOutOfSyncError);
    expect(error2).to.throw(CloudKeyStorageOutOfSyncError);
    expect(error3).to.throw(CloudKeyStorageOutOfSyncError);
    try {
      await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await cloudKeyStorage.storeEntries(keyEntries);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await cloudKeyStorage.updateEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await cloudKeyStorage.deleteEntry(keyEntry1.name);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await cloudKeyStorage.deleteEntries([keyEntry1.name, keyEntry2.name]);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
    try {
      await cloudKeyStorage.updateRecipients({
        newPrivateKey: privateKey,
        newPublicKeys: publicKey,
      });
    } catch (error) {
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    }
  });

  it('KTC-41', async () => {
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
    const keyPair = virgilCrypto.generateKeys();
    const keyknoxManager = new KeyknoxManager(
      keyPair.privateKey,
      keyPair.publicKey,
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(accessTokenProvider, process.env.API_URL),
    );
    cloudKeyStorage = new CloudKeyStorage(keyknoxManager);
    await keyknoxManager.v1Push(uuid());
    await cloudKeyStorage.deleteAllEntries();
    await cloudKeyStorage.retrieveCloudEntries();
    let entries = cloudKeyStorage.retrieveAllEntries();
    expect(entries).to.have.length(0);
    const [keyEntry] = generateKeyEntries(1);
    await cloudKeyStorage.storeEntry(keyEntry.name, keyEntry.data, keyEntry.meta);
    entries = cloudKeyStorage.retrieveAllEntries();
    expect(entries).to.have.length(1);
  });

  it('throws `CloudEntryExistsError` if we try to store entry with name that is already in use', async () => {
    const [keyEntry1, keyEntry2] = generateKeyEntries(2);
    keyEntry2.name = keyEntry1.name;
    await cloudKeyStorage.retrieveCloudEntries();
    await cloudKeyStorage.storeEntry(keyEntry1.name, keyEntry1.data, keyEntry1.meta);
    try {
      await cloudKeyStorage.storeEntries([keyEntry2]);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudEntryExistsError);
    }
    try {
      await cloudKeyStorage.storeEntry(keyEntry2.name, keyEntry2.data, keyEntry2.meta);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudEntryExistsError);
    }
  });

  it('throws `CloudEntryDoesntExistError` if we try to retrieve non-existent entry', async () => {
    await cloudKeyStorage.retrieveCloudEntries();
    const retrieve = () => cloudKeyStorage.retrieveEntry('123');
    expect(retrieve).to.throw(CloudEntryDoesntExistError);
  });

  it('throws `CloudEntryDoesntExistError` if we try to delete non-existent entry', async () => {
    await cloudKeyStorage.retrieveCloudEntries();
    try {
      await cloudKeyStorage.deleteEntry('123');
    } catch (error) {
      expect(error).to.be.instanceOf(CloudEntryDoesntExistError);
    }
    try {
      await cloudKeyStorage.deleteEntries(['123', '456']);
    } catch (error) {
      expect(error).to.be.instanceOf(CloudEntryDoesntExistError);
    }
  });
});

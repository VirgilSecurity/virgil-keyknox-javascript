import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto';
import { IAccessTokenProvider, IKeyEntry, IKeyEntryStorage } from 'virgil-sdk';

import CloudKeyStorage from './CloudKeyStorage';
import { KeyEntry, CloudEntry } from './entities';
import { KeyEntryExistsError, KeyEntryDoesntExistError } from './errors';
import { createKeyEntry, extractDate } from './KeyEntryUtils';
import { Data, Meta } from './types';

export default class SyncKeyStorage {
  private readonly identity: string;
  private readonly cloudKeyStorage: CloudKeyStorage;
  private readonly keyEntryStorage: IKeyEntryStorage;

  constructor(
    identity: string,
    cloudKeyStorage: CloudKeyStorage,
    keyEntryStorage: IKeyEntryStorage,
  ) {
    this.identity = identity;
    this.cloudKeyStorage = cloudKeyStorage;
    this.keyEntryStorage = keyEntryStorage;
  }

  static create(options: {
    identity: string;
    accessTokenProvider: IAccessTokenProvider;
    privateKey: VirgilPrivateKey;
    publicKey?: VirgilPublicKey;
    publicKeys?: VirgilPublicKey[];
    keyEntryStorage: IKeyEntryStorage;
  }): SyncKeyStorage {
    if (!options.publicKey && !options.publicKeys) {
      throw new TypeError("You need to specify 'publicKey' or 'publicKeys'");
    }
    const { accessTokenProvider, privateKey, publicKey, publicKeys } = options;
    const cloudKeyStorage = CloudKeyStorage.create({
      accessTokenProvider,
      privateKey,
      publicKey,
      publicKeys,
    });
    return new SyncKeyStorage(options.identity, cloudKeyStorage, options.keyEntryStorage);
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<IKeyEntry[]> {
    const checkRequests = keyEntries.map(keyEntry => this.throwIfKeyEntryExists(keyEntry.name));
    await Promise.all(checkRequests);
    const cloudEntries = await this.cloudKeyStorage.storeEntries(keyEntries);
    const storeRequests = cloudEntries.map(async cloudEntry => {
      const keyEntry = createKeyEntry(cloudEntry);
      return this.keyEntryStorage.save(keyEntry);
    });
    return Promise.all(storeRequests);
  }

  async storeEntry(name: string, data: Data, meta?: Meta): Promise<IKeyEntry> {
    const [keyEntry] = await this.storeEntries([{ name, data, meta }]);
    return keyEntry;
  }

  async updateEntry(name: string, data: Data, meta?: Meta): Promise<void> {
    await this.throwUnlessKeyEntryExists(name);
    const cloudEntry = await this.cloudKeyStorage.updateEntry(name, data, meta);
    const keyEntry = createKeyEntry(cloudEntry);
    await this.keyEntryStorage.update(keyEntry);
  }

  async retrieveEntry(name: string): Promise<IKeyEntry> {
    await this.throwUnlessKeyEntryExists(name);
    return this.keyEntryStorage.load(name) as Promise<IKeyEntry>;
  }

  retrieveAllEntries(): Promise<IKeyEntry[]> {
    return this.keyEntryStorage.list();
  }

  existsEntry(name: string): Promise<boolean> {
    return this.keyEntryStorage.exists(name);
  }

  deleteEntry(name: string): Promise<void> {
    return this.deleteEntries([name]);
  }

  async deleteEntries(names: string[]): Promise<void> {
    await this.cloudKeyStorage.deleteEntries(names);
    const deleteRequests = names.map(name => this.keyEntryStorage.remove(name));
    await Promise.all(deleteRequests);
  }

  async deleteAllEntries(): Promise<void> {
    await this.cloudKeyStorage.deleteAllEntries();
    const keyEntries = await this.keyEntryStorage.list();
    const deleteRequests = keyEntries.map(keyEntry => this.keyEntryStorage.remove(keyEntry.name));
    await Promise.all(deleteRequests);
  }

  async updateRecipients(options: {
    newPrivateKey?: VirgilPrivateKey;
    newPublicKey?: VirgilPublicKey;
    newPublicKeys?: VirgilPublicKey[];
  }): Promise<void> {
    const { newPrivateKey, newPublicKey, newPublicKeys } = options;
    return this.cloudKeyStorage.updateRecipients({
      newPrivateKey,
      newPublicKey,
      newPublicKeys,
    });
  }

  async sync(): Promise<void> {
    await this.cloudKeyStorage.retrieveCloudEntries();
    const cloudEntries = this.cloudKeyStorage.retrieveAllEntries();
    const cloudEntriesMap = cloudEntries.reduce<{ [key: string]: CloudEntry | undefined }>(
      (result, cloudEntry) => {
        result[cloudEntry.name] = cloudEntry;
        return result;
      },
      {},
    );
    const keyEntries = await this.keyEntryStorage.list();
    const keyEntriesMap = keyEntries.reduce<{ [key: string]: IKeyEntry | undefined }>(
      (result, keyEntry) => {
        result[keyEntry.name] = keyEntry;
        return result;
      },
      {},
    );

    const storeNames: string[] = [];
    const updateNames: string[] = [];
    const deleteNames: string[] = [];
    cloudEntries.forEach(cloudEntry => {
      const keyEntry = keyEntriesMap[cloudEntry.name];
      if (keyEntry) {
        const { modificationDate } = extractDate(keyEntry);
        if (cloudEntry.modificationDate > modificationDate) {
          return updateNames.push(cloudEntry.name);
        }
      } else {
        storeNames.push(cloudEntry.name);
      }
    });
    keyEntries.forEach(keyEntry => {
      if (!cloudEntriesMap[keyEntry.name]) {
        deleteNames.push(keyEntry.name);
      }
    });

    return this.syncKeyStorage(storeNames, updateNames, deleteNames);
  }

  private async throwUnlessKeyEntryExists(name: string): Promise<void> {
    const exists = await this.keyEntryStorage.exists(name);
    if (!exists) {
      throw new KeyEntryDoesntExistError(name);
    }
  }

  private async throwIfKeyEntryExists(name: string): Promise<void> {
    const exists = await this.keyEntryStorage.exists(name);
    if (exists) {
      throw new KeyEntryExistsError(name);
    }
  }

  private async syncKeyStorage(
    storeNames: string[],
    updateNames: string[],
    deleteNames: string[],
  ): Promise<void> {
    const deleteRequests = deleteNames.map(async name => {
      await this.keyEntryStorage.remove(name);
    });
    const updateRequests = updateNames.map(async name => {
      const cloudEntry = this.cloudKeyStorage.retrieveEntry(name);
      const keyEntry = createKeyEntry(cloudEntry);
      await this.keyEntryStorage.update(keyEntry);
    });
    const storeRequests = storeNames.map(async name => {
      const cloudEntry = this.cloudKeyStorage.retrieveEntry(name);
      const keyEntry = createKeyEntry(cloudEntry);
      await this.keyEntryStorage.save(keyEntry);
    });
    await Promise.all([...deleteRequests, ...updateRequests, ...storeRequests]);
  }
}

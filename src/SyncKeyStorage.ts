import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto/dist/types/interfaces';

import IKeyStorage from './storages/IKeyStorage';
import CloudKeyStorage from './CloudKeyStorage';
import { KeyEntry, KeychainEntry } from './entities';
import { createKeychainEntry, extractDates } from './utils';
import { Data, Meta } from './types';

export default class SyncKeyStorage {
  private readonly identity: string;
  private readonly cloudKeyStorage: CloudKeyStorage;
  private readonly keyStorage: IKeyStorage;

  constructor(identity: string, cloudKeyStorage: CloudKeyStorage, keyStorage: IKeyStorage) {
    this.identity = identity;
    this.cloudKeyStorage = cloudKeyStorage;
    this.keyStorage = keyStorage;
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<KeychainEntry[]> {
    const checkRequests = keyEntries.map(keyEntry =>
      this.checkIfKeychainEntryNotExists(keyEntry.name),
    );
    await Promise.all(checkRequests);
    const cloudEntries = await this.cloudKeyStorage.storeEntries(keyEntries);
    const storeRequests = cloudEntries.map(cloudEntry => {
      const entry = createKeychainEntry(cloudEntry);
      return this.keyStorage.store(entry.name, entry.data, entry.meta);
    });
    const keychainEntries = await Promise.all(storeRequests);
    return keychainEntries;
  }

  async storeEntry(name: string, data: Data, meta?: Meta): Promise<KeychainEntry> {
    const [keychainEntry] = await this.storeEntries([{ name, data, meta }]);
    return keychainEntry;
  }

  async updateEntry(name: string, data: Data, meta?: Meta): Promise<void> {
    await this.checkIfKeychainEntryExists(name);
    const cloudEntry = await this.cloudKeyStorage.updateEntry(name, data, meta);
    const entry = createKeychainEntry(cloudEntry);
    await this.keyStorage.updateEntry(entry.name, entry.data, entry.meta);
  }

  retrieveEntry(name: string): Promise<KeychainEntry> {
    return this.keyStorage.retrieveEntry(name);
  }

  retrieveAllEntries(): Promise<KeychainEntry[]> {
    return this.keyStorage.retrieveAllEntries();
  }

  existsEntry(name: string): Promise<boolean> {
    return this.keyStorage.existsEntry(name);
  }

  deleteEntry(name: string): Promise<void> {
    return this.deleteEntries([name]);
  }

  async deleteEntries(names: string[]): Promise<void> {
    const deleteRequests = names.map(name => this.keyStorage.deleteEntry(name));
    await Promise.all(deleteRequests);
    await this.cloudKeyStorage.deleteEntries(names);
  }

  async deleteAllEntries(): Promise<void> {
    const keychainEntries = await this.keyStorage.retrieveAllEntries();
    const deleteRequests = keychainEntries.map(keychainEntry =>
      this.keyStorage.deleteEntry(keychainEntry.name),
    );
    await Promise.all(deleteRequests);
    await this.cloudKeyStorage.deleteAllEntries();
  }

  async updateRecipients(
    newPrivateKey?: VirgilPrivateKey,
    newPublicKey?: VirgilPublicKey | VirgilPublicKey[],
  ): Promise<void> {
    return this.cloudKeyStorage.updateRecipients(newPrivateKey, newPublicKey);
  }

  async sync(): Promise<void> {
    await this.cloudKeyStorage.retrieveCloudEntries();
    const cloudEntries = this.cloudKeyStorage.retrieveAllEntries();
    const keychainEntries = await this.keyStorage.retrieveAllEntries();
    const keychainEntriesMap: { [key: string]: KeychainEntry | undefined } = {};
    keychainEntries.forEach(keychainEntry => {
      keychainEntriesMap[keychainEntry.name] = keychainEntry;
    });

    const storeNames: string[] = [];
    const deleteNames: string[] = [];
    cloudEntries.forEach(cloudEntry => {
      const keychainEntry = keychainEntriesMap[cloudEntry.name];
      if (keychainEntry) {
        const keychainDates = extractDates(keychainEntry);
        if (cloudEntry.modificationDate > keychainDates.modificationDate) {
          storeNames.push(cloudEntry.name);
        }
      } else {
        storeNames.push(cloudEntry.name);
      }
    });
    keychainEntries.forEach(keychainEntry => {
      if (!this.cloudKeyStorage.existsEntry(keychainEntry.name)) {
        deleteNames.push(keychainEntry.name);
      }
    });

    return this.syncKeyStorage(storeNames, deleteNames);
  }

  private async checkIfKeychainEntryExists(name: string): Promise<void> {
    const exists = await this.keyStorage.existsEntry(name);
    if (!exists) {
      throw new Error();
    }
  }

  private async checkIfKeychainEntryNotExists(name: string): Promise<void> {
    const exists = await this.keyStorage.existsEntry(name);
    if (exists) {
      throw new Error();
    }
  }

  private syncKeyStorage(storeNames: string[], deleteNames: string[]): Promise<void> {
    const deleteRequests = deleteNames.map(name => this.keyStorage.deleteEntry(name));
    const storeRequests = storeNames.map(name => {
      const cloudEntry = this.cloudKeyStorage.retrieveEntry(name);
      const entry = createKeychainEntry(cloudEntry);
      return this.keyStorage
        .store(entry.name, entry.data, entry.meta)
        .then(() => Promise.resolve());
    });
    return Promise.all([...deleteRequests, ...storeRequests]).then(() => Promise.resolve());
  }
}

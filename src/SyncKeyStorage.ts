import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto/dist/types/interfaces';
import { IKeyEntry, IKeyStorage } from 'virgil-sdk/dist/types/Sdk/Lib/KeyStorage/IKeyStorage';

import CloudKeyStorage from './CloudKeyStorage';
import { KeyEntry } from './entities';
import { createKeyEntry, extractDate } from './KeyEntryUtils';
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

  async storeEntries(keyEntries: KeyEntry[]): Promise<IKeyEntry[]> {
    const checkRequests = keyEntries.map(keyEntry => this.checkIfKeyEntryNotExists(keyEntry.name));
    await Promise.all(checkRequests);
    const cloudEntries = await this.cloudKeyStorage.storeEntries(keyEntries);
    const storedKeyEntries: IKeyEntry[] = [];
    const storeRequests = cloudEntries.map(cloudEntry => {
      const keyEntry = createKeyEntry(cloudEntry);
      storedKeyEntries.push(keyEntry);
      return this.keyStorage.save(keyEntry);
    });
    await Promise.all(storeRequests);
    return storedKeyEntries;
  }

  async storeEntry(name: string, data: Data, meta?: Meta): Promise<IKeyEntry> {
    const [keyEntry] = await this.storeEntries([{ name, data, meta }]);
    return keyEntry;
  }

  async updateEntry(name: string, data: Data, meta?: Meta): Promise<void> {
    await this.checkIfKeyEntryExists(name);
    const cloudEntry = await this.cloudKeyStorage.updateEntry(name, data, meta);
    const keyEntry = createKeyEntry(cloudEntry);
    await this.keyStorage.save(keyEntry);
  }

  retrieveEntry(name: string): Promise<IKeyEntry> {
    this.checkIfKeyEntryExists(name);
    return this.keyStorage.load(name) as Promise<IKeyEntry>;
  }

  retrieveAllEntries(): Promise<IKeyEntry[]> {
    return this.keyStorage.list();
  }

  existsEntry(name: string): Promise<boolean> {
    return this.keyStorage.exists(name);
  }

  deleteEntry(name: string): Promise<void> {
    return this.deleteEntries([name]);
  }

  async deleteEntries(names: string[]): Promise<void> {
    const deleteRequests = names.map(name => this.keyStorage.remove(name));
    await Promise.all(deleteRequests);
    await this.cloudKeyStorage.deleteEntries(names);
  }

  async deleteAllEntries(): Promise<void> {
    const keyEntries = await this.keyStorage.list();
    const deleteRequests = keyEntries.map(keyEntry => this.keyStorage.remove(keyEntry.name));
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
    const keyEntries = await this.keyStorage.list();
    const keyEntriesMap: { [key: string]: IKeyEntry | undefined } = {};
    keyEntries.forEach(keyEntry => {
      keyEntriesMap[keyEntry.name] = keyEntry;
    });

    const storeNames: string[] = [];
    const deleteNames: string[] = [];
    cloudEntries.forEach(cloudEntry => {
      const keyEntry = keyEntriesMap[cloudEntry.name];
      if (keyEntry) {
        const keyEntryDate = extractDate(keyEntry);
        if (cloudEntry.modificationDate > keyEntryDate.modificationDate) {
          storeNames.push(cloudEntry.name);
        }
      } else {
        storeNames.push(cloudEntry.name);
      }
    });
    keyEntries.forEach(keyEntry => {
      if (!this.cloudKeyStorage.existsEntry(keyEntry.name)) {
        deleteNames.push(keyEntry.name);
      }
    });

    return this.syncKeyStorage(storeNames, deleteNames);
  }

  private async checkIfKeyEntryExists(name: string): Promise<void> {
    const exists = await this.keyStorage.exists(name);
    if (!exists) {
      throw new Error();
    }
  }

  private async checkIfKeyEntryNotExists(name: string): Promise<void> {
    const exists = await this.keyStorage.exists(name);
    if (exists) {
      throw new Error();
    }
  }

  private syncKeyStorage(storeNames: string[], deleteNames: string[]): Promise<void> {
    const deleteRequests = deleteNames.map(name =>
      this.keyStorage.remove(name).then(() => Promise.resolve()),
    );
    const storeRequests = storeNames.map(name => {
      const cloudEntry = this.cloudKeyStorage.retrieveEntry(name);
      const entry = createKeyEntry(cloudEntry);
      return this.keyStorage.save(entry).then(() => Promise.resolve());
    });
    return Promise.all([...deleteRequests, ...storeRequests]).then(() => Promise.resolve());
  }
}

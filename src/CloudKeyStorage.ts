import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto/dist/types/interfaces';

import { CloudEntry, DecryptedKeyknoxValue, KeyEntry } from './entities';
import KeyknoxManager from './KeyknoxManager';
import { serialize, deserialize } from './CloudEntrySerializer';

export default class CloudKeyStorage {
  private readonly keyknoxManager: KeyknoxManager;

  private decryptedKeyknoxValue?: DecryptedKeyknoxValue;
  private cache: { [key: string]: CloudEntry } = {};
  private syncWasCalled: boolean = false;

  constructor(keyknoxManager: KeyknoxManager) {
    this.keyknoxManager = keyknoxManager;
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<CloudEntry[]> {
    this.checkSyncCall();
    keyEntries.forEach(keyEntry => {
      this.checkIfCloudEntryNotExists(keyEntry.name);
      this.cache[keyEntry.name] = CloudKeyStorage.createCloudEntry(keyEntry);
    });
    await this.pushCacheEntries();
    return keyEntries.map(keyEntry => this.cache[keyEntry.name]);
  }

  async storeEntry(
    name: string,
    data: Buffer,
    meta?: { [key: string]: string },
  ): Promise<CloudEntry> {
    const [cloudEntry] = await this.storeEntries([{ name, data, meta }]);
    return cloudEntry;
  }

  async updateEntry(
    name: string,
    data: Buffer,
    meta?: { [key: string]: string },
  ): Promise<CloudEntry> {
    this.checkSyncCall();
    this.checkIfCloudEntryExists(name);
    this.cache[name] = CloudKeyStorage.createCloudEntry(
      { name, data, meta },
      this.cache[name].creationDate,
    );
    await this.pushCacheEntries();
    return this.cache[name];
  }

  retrieveEntry(name: string): CloudEntry {
    this.checkSyncCall();
    this.checkIfCloudEntryExists(name);
    return this.cache[name];
  }

  retrieveAllEntries(): CloudEntry[] {
    this.checkSyncCall();
    return Object.values(this.cache);
  }

  existsEntry(name: string): boolean {
    this.checkSyncCall();
    return Boolean(this.cache[name]);
  }

  deleteEntry(name: string): Promise<void> {
    return this.deleteEntries([name]);
  }

  deleteEntries(names: string[]): Promise<void> {
    this.checkSyncCall();
    names.forEach(name => {
      this.checkIfCloudEntryExists(name);
      delete this.cache[name];
    });
    return this.pushCacheEntries();
  }

  deleteAllEntries(): Promise<void> {
    this.checkSyncCall();
    this.cache = {};
    return this.pushCacheEntries();
  }

  async updateRecipients(
    newPublicKey?: VirgilPublicKey | VirgilPublicKey[],
    newPrivateKey?: VirgilPrivateKey,
  ): Promise<void> {
    this.checkSyncCall();
    this.decryptedKeyknoxValue = await this.keyknoxManager.updateRecipients({
      newPrivateKey,
      newPublicKey,
    });
    this.cache = deserialize(this.decryptedKeyknoxValue.value);
  }

  async retrieveCloudEntries(): Promise<void> {
    this.decryptedKeyknoxValue = await this.keyknoxManager.pullValue();
    this.cache = deserialize(this.decryptedKeyknoxValue.value);
    this.syncWasCalled = true;
  }

  private checkSyncCall() {
    if (!this.syncWasCalled) {
      throw new Error();
    }
  }

  private checkIfCloudEntryExists(entryName: string) {
    if (!this.cache[entryName]) {
      throw new Error();
    }
  }

  private checkIfCloudEntryNotExists(entryName: string) {
    if (this.cache[entryName]) {
      throw new Error();
    }
  }

  private async pushCacheEntries(): Promise<void> {
    const value = serialize(this.cache);
    this.decryptedKeyknoxValue = await this.keyknoxManager.pushValue(
      value,
      this.decryptedKeyknoxValue!.keyknoxHash,
    );
    this.cache = deserialize(this.decryptedKeyknoxValue.value);
  }

  private static createCloudEntry(keyEntry: KeyEntry, creationDate?: Date): CloudEntry {
    const now = new Date();
    return {
      name: keyEntry.name,
      data: keyEntry.data,
      meta: keyEntry.meta,
      creationDate: creationDate || now,
      modificationDate: now,
    };
  }
}

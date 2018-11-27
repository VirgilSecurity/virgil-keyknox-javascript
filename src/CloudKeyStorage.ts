import { VirgilPrivateKey, VirgilPublicKey } from 'virgil-crypto';
import { IAccessTokenProvider } from 'virgil-sdk';

import { CloudEntry, DecryptedKeyknoxValue, KeyEntry } from './entities';
import {
  CloudKeyStorageOutOfSyncError,
  CloudEntryExistsError,
  CloudEntryDoesntExistError,
} from './errors';
import KeyknoxManager from './KeyknoxManager';
import { serialize, deserialize } from './CloudEntrySerializer';
import { Meta } from './types';

export default class CloudKeyStorage {
  private readonly keyknoxManager: KeyknoxManager;

  private decryptedKeyknoxValue?: DecryptedKeyknoxValue;
  private cache: Map<string, CloudEntry> = new Map();
  private syncWasCalled: boolean = false;

  constructor(keyknoxManager: KeyknoxManager) {
    this.keyknoxManager = keyknoxManager;
  }

  static create(options: {
    accessTokenProvider: IAccessTokenProvider;
    privateKey: VirgilPrivateKey;
    publicKeys: VirgilPublicKey | VirgilPublicKey[];
  }): CloudKeyStorage {
    const keyknoxManager = new KeyknoxManager(
      options.accessTokenProvider,
      options.privateKey,
      options.publicKeys,
    );
    return new CloudKeyStorage(keyknoxManager);
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<CloudEntry[]> {
    this.throwUnlessSyncWasCalled();
    keyEntries.forEach(keyEntry => {
      this.throwIfCloudEntryExists(keyEntry.name);
      this.cache.set(keyEntry.name, CloudKeyStorage.createCloudEntry(keyEntry));
    });
    await this.pushCacheEntries();
    return keyEntries.map(keyEntry => this.cache.get(keyEntry.name)!);
  }

  async storeEntry(name: string, data: Buffer, meta?: Meta): Promise<CloudEntry> {
    const [cloudEntry] = await this.storeEntries([{ name, data, meta }]);
    return cloudEntry;
  }

  async updateEntry(name: string, data: Buffer, meta?: Meta): Promise<CloudEntry> {
    this.throwUnlessSyncWasCalled();
    this.throwUnlessCloudEntryExists(name);
    const cloudEntry = CloudKeyStorage.createCloudEntry(
      { name, data, meta },
      this.cache.get(name)!.creationDate,
    );
    this.cache.set(name, cloudEntry);
    await this.pushCacheEntries();
    return cloudEntry;
  }

  retrieveEntry(name: string): CloudEntry {
    this.throwUnlessSyncWasCalled();
    this.throwUnlessCloudEntryExists(name);
    return this.cache.get(name)!;
  }

  retrieveAllEntries(): CloudEntry[] {
    this.throwUnlessSyncWasCalled();
    return Array.from(this.cache.values());
  }

  existsEntry(name: string): boolean {
    this.throwUnlessSyncWasCalled();
    return this.cache.has(name);
  }

  async deleteEntry(name: string): Promise<void> {
    await this.deleteEntries([name]);
  }

  async deleteEntries(names: string[]): Promise<void> {
    this.throwUnlessSyncWasCalled();
    names.forEach(name => {
      this.throwUnlessCloudEntryExists(name);
      this.cache.delete(name);
    });
    await this.pushCacheEntries();
  }

  async deleteAllEntries(): Promise<void> {
    this.cache.clear();
    await this.keyknoxManager.resetValue();
  }

  async updateRecipients(options: {
    newPrivateKey?: VirgilPrivateKey;
    newPublicKeys?: VirgilPublicKey | VirgilPublicKey[];
  }): Promise<void> {
    this.throwUnlessSyncWasCalled();
    const { newPrivateKey, newPublicKeys } = options;
    this.decryptedKeyknoxValue = await this.keyknoxManager.updateRecipients({
      newPrivateKey,
      newPublicKeys,
    });
    this.cache = deserialize(this.decryptedKeyknoxValue.value);
  }

  async retrieveCloudEntries(): Promise<void> {
    this.decryptedKeyknoxValue = await this.keyknoxManager.pullValue();
    this.cache = deserialize(this.decryptedKeyknoxValue.value);
    this.syncWasCalled = true;
  }

  private throwUnlessSyncWasCalled() {
    if (!this.syncWasCalled) {
      throw new CloudKeyStorageOutOfSyncError();
    }
  }

  private throwUnlessCloudEntryExists(entryName: string) {
    if (!this.cache.has(entryName)) {
      throw new CloudEntryDoesntExistError(entryName);
    }
  }

  private throwIfCloudEntryExists(entryName: string) {
    if (this.cache.has(entryName)) {
      throw new CloudEntryExistsError(entryName);
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
      meta: typeof keyEntry.meta === 'undefined' ? null : keyEntry.meta,
      creationDate: creationDate || now,
      modificationDate: now,
    };
  }
}

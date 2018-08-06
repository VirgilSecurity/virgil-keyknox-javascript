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
import { Data, Meta } from './types';

export default class CloudKeyStorage {
  private readonly keyknoxManager: KeyknoxManager;

  private decryptedKeyknoxValue?: DecryptedKeyknoxValue;
  private cache: { [key: string]: CloudEntry } = {};
  private syncWasCalled: boolean = false;

  constructor(keyknoxManager: KeyknoxManager) {
    this.keyknoxManager = keyknoxManager;
  }

  static create(
    accessTokenProvider: IAccessTokenProvider,
    privateKey: VirgilPrivateKey,
    publicKey: VirgilPublicKey | VirgilPublicKey[],
  ): CloudKeyStorage {
    const keyknoxManager = new KeyknoxManager(accessTokenProvider, privateKey, publicKey);
    return new CloudKeyStorage(keyknoxManager);
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<CloudEntry[]> {
    this.throwUnlessSyncWasCalled();
    keyEntries.forEach(keyEntry => {
      this.throwIfCloudEntryExists(keyEntry.name);
      this.cache[keyEntry.name] = CloudKeyStorage.createCloudEntry(keyEntry);
    });
    await this.pushCacheEntries();
    return keyEntries.map(keyEntry => this.cache[keyEntry.name]);
  }

  async storeEntry(name: string, data: Data, meta?: Meta): Promise<CloudEntry> {
    const [cloudEntry] = await this.storeEntries([{ name, data, meta }]);
    return cloudEntry;
  }

  async updateEntry(name: string, data: Data, meta?: Meta): Promise<CloudEntry> {
    this.throwUnlessSyncWasCalled();
    this.throwUnlessCloudEntryExists(name);
    this.cache[name] = CloudKeyStorage.createCloudEntry(
      { name, data, meta },
      this.cache[name].creationDate,
    );
    await this.pushCacheEntries();
    return this.cache[name];
  }

  retrieveEntry(name: string): CloudEntry {
    this.throwUnlessSyncWasCalled();
    this.throwUnlessCloudEntryExists(name);
    return this.cache[name];
  }

  retrieveAllEntries(): CloudEntry[] {
    this.throwUnlessSyncWasCalled();
    return Object.values(this.cache);
  }

  existsEntry(name: string): boolean {
    this.throwUnlessSyncWasCalled();
    return Boolean(this.cache[name]);
  }

  async deleteEntry(name: string): Promise<void> {
    await this.deleteEntries([name]);
  }

  async deleteEntries(names: string[]): Promise<void> {
    this.throwUnlessSyncWasCalled();
    names.forEach(name => {
      this.throwUnlessCloudEntryExists(name);
      delete this.cache[name];
    });
    await this.pushCacheEntries();
  }

  async deleteAllEntries(): Promise<void> {
    this.throwUnlessSyncWasCalled();
    this.cache = {};
    await this.pushCacheEntries();
  }

  async updateRecipients(
    newPrivateKey?: VirgilPrivateKey,
    newPublicKey?: VirgilPublicKey | VirgilPublicKey[],
  ): Promise<void> {
    this.throwUnlessSyncWasCalled();
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

  private throwUnlessSyncWasCalled() {
    if (!this.syncWasCalled) {
      throw new CloudKeyStorageOutOfSyncError();
    }
  }

  private throwUnlessCloudEntryExists(entryName: string) {
    if (!this.cache[entryName]) {
      throw new CloudEntryDoesntExistError(entryName);
    }
  }

  private throwIfCloudEntryExists(entryName: string) {
    if (this.cache[entryName]) {
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

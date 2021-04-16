import { KeyknoxCrypto } from './KeyknoxCrypto';
import {
  CloudKeyStorageOutOfSyncError,
  CloudEntryExistsError,
  CloudEntryDoesntExistError,
} from './errors';
import { KeyknoxManager } from './KeyknoxManager';
import { serialize, deserialize } from './CloudEntrySerializer';
import {
  ICrypto,
  IPrivateKey,
  IPublicKey,
  IAccessTokenProvider,
  Meta,
  DecryptedKeyknoxValueV1,
  CloudEntry,
  KeyEntry,
} from './types';

export class CloudKeyStorage {
  private readonly keyknoxManager: KeyknoxManager;

  private privateKey: IPrivateKey;
  private publicKeys: IPublicKey | IPublicKey[];
  private decryptedKeyknoxValue?: DecryptedKeyknoxValueV1;
  private cache: Map<string, CloudEntry> = new Map();
  private syncWasCalled = false;

  constructor(
    keyknoxManager: KeyknoxManager,
    privateKey: IPrivateKey,
    publicKeys: IPublicKey | IPublicKey[],
  ) {
    this.keyknoxManager = keyknoxManager;
    this.privateKey = privateKey;
    this.publicKeys = publicKeys;
  }

  static create(options: {
    accessTokenProvider: IAccessTokenProvider;
    privateKey: IPrivateKey;
    publicKeys: IPublicKey | IPublicKey[];
    virgilCrypto: ICrypto;
  }): CloudKeyStorage {
    const { accessTokenProvider, privateKey, publicKeys, virgilCrypto } = options;
    const keyknoxManager = KeyknoxManager.create(
      accessTokenProvider,
      new KeyknoxCrypto(virgilCrypto),
    );
    return new CloudKeyStorage(keyknoxManager, privateKey, publicKeys);
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<CloudEntry[]> {
    this.throwUnlessSyncWasCalled();
    keyEntries.forEach(keyEntry => {
      this.throwIfCloudEntryExists(keyEntry.name);
      this.cache.set(keyEntry.name, CloudKeyStorage.createCloudEntry(keyEntry));
    });
    await this.pushCacheEntries();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return keyEntries.map(keyEntry => this.cache.get(keyEntry.name)!);
  }

  async storeEntry(name: string, data: string, meta?: Meta): Promise<CloudEntry>;
  async storeEntry(name: string, data: string, keyname?: string): Promise<CloudEntry>;
  async storeEntry(name: string, data: string, metaOrKeyName?: Meta | string): Promise<CloudEntry> {
    if (typeof metaOrKeyName === 'string') {
      const keyName = metaOrKeyName;
      const decryptedKeyknoxValue = await this.keyknoxManager.v2Pull({
        root: 'e3kit',
        path: 'backup',
        key: keyName,
        identity: name,
        privateKey: this.privateKey,
        publicKeys: this.publicKeys,
      });
      const cloudEntry = CloudKeyStorage.createCloudEntry({ name: keyName, data });
      const decryptedKeyknoxPushedValue = await this.keyknoxManager.v2Push({
        root: 'e3kit',
        path: 'backup',
        key: keyName,
        identities: [name],
        value: serialize(new Map([[keyName, cloudEntry]])),
        privateKey: this.privateKey,
        publicKeys: this.publicKeys,
        keyknoxHash: decryptedKeyknoxValue.keyknoxHash,
      });
      return deserialize(decryptedKeyknoxPushedValue.value)
        .values()
        .next().value;
    } else {
      const [cloudEntry] = await this.storeEntries([{ name, data, meta: metaOrKeyName }]);
      return cloudEntry;
    }
  }

  async updateEntry(name: string, data: string, meta?: Meta): Promise<CloudEntry> {
    this.throwUnlessSyncWasCalled();
    this.throwUnlessCloudEntryExists(name);
    const cloudEntry = CloudKeyStorage.createCloudEntry(
      { name, data, meta },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.cache.get(name)!.creationDate,
    );
    this.cache.set(name, cloudEntry);
    await this.pushCacheEntries();
    return cloudEntry;
  }

  retrieveEntry(name: string): CloudEntry {
    this.throwUnlessSyncWasCalled();
    this.throwUnlessCloudEntryExists(name);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.cache.get(name)!;
  }

  async fetchEntryByKey(name: string, keyName: string): Promise<CloudEntry> {
    const decryptedKeyknoxValue = await this.keyknoxManager.v2Pull({
      root: 'e3kit',
      path: 'backup',
      key: keyName,
      identity: name,
      privateKey: this.privateKey,
      publicKeys: this.publicKeys,
    });
    return deserialize(decryptedKeyknoxValue.value)
      .values()
      .next().value;
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
    this.decryptedKeyknoxValue = await this.keyknoxManager.v1Reset();
  }

  async updateRecipients(options: {
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }): Promise<void> {
    this.throwUnlessSyncWasCalled();
    const { newPrivateKey, newPublicKeys } = options;
    this.decryptedKeyknoxValue = await this.keyknoxManager.v1UpdateRecipients({
      newPrivateKey,
      newPublicKeys,
      privateKey: this.privateKey,
      publicKeys: this.publicKeys,
    });
    this.privateKey = newPrivateKey || this.privateKey;
    this.publicKeys = newPublicKeys || this.publicKeys;
    this.cache = deserialize(this.decryptedKeyknoxValue.value);
  }

  async retrieveCloudEntries(): Promise<void> {
    this.decryptedKeyknoxValue = await this.keyknoxManager.v1Pull(this.privateKey, this.publicKeys);
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
    this.decryptedKeyknoxValue = await this.keyknoxManager.v1Push(
      value,
      this.privateKey,
      this.publicKeys,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

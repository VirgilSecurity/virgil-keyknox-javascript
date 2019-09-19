import { CloudKeyStorage } from './CloudKeyStorage';
import { KeyEntry, CloudEntry } from './entities';
import { KeyEntryExistsError, KeyEntryDoesntExistError } from './errors';
import { KeyEntryStorageWrapper } from './KeyEntryStorageWrapper';
import { createKeyEntry, extractDate } from './KeyEntryUtils';
import {
  Meta,
  ICrypto,
  IPrivateKey,
  IPublicKey,
  IAccessTokenProvider,
  IKeyEntry,
  IKeyEntryStorage,
} from './types';

export class SyncKeyStorage {
  private readonly cloudKeyStorage: CloudKeyStorage;
  private readonly keyEntryStorageWrapper: KeyEntryStorageWrapper;

  constructor(
    identity: string,
    cloudKeyStorage: CloudKeyStorage,
    keyEntryStorage: IKeyEntryStorage,
  ) {
    this.cloudKeyStorage = cloudKeyStorage;
    this.keyEntryStorageWrapper = new KeyEntryStorageWrapper(identity, keyEntryStorage);
  }

  static create(options: {
    identity: string;
    accessTokenProvider: IAccessTokenProvider;
    privateKey: IPrivateKey;
    publicKeys: IPublicKey | IPublicKey[];
    virgilCrypto: ICrypto;
    keyEntryStorage: IKeyEntryStorage;
  }): SyncKeyStorage {
    const { virgilCrypto, identity, accessTokenProvider, privateKey, publicKeys } = options;
    const cloudKeyStorage = CloudKeyStorage.create({
      accessTokenProvider,
      privateKey,
      publicKeys,
      virgilCrypto,
    });
    return new SyncKeyStorage(identity, cloudKeyStorage, options.keyEntryStorage);
  }

  async storeEntries(keyEntries: KeyEntry[]): Promise<IKeyEntry[]> {
    const checkRequests = keyEntries.map(keyEntry => this.throwIfKeyEntryExists(keyEntry.name));
    await Promise.all(checkRequests);
    const cloudEntries = await this.cloudKeyStorage.storeEntries(keyEntries);
    const storeRequests = cloudEntries.map(async cloudEntry => {
      const keyEntry = createKeyEntry(cloudEntry);
      return this.keyEntryStorageWrapper.save(keyEntry);
    });
    return Promise.all(storeRequests);
  }

  async storeEntry(name: string, data: string, meta?: Meta): Promise<IKeyEntry> {
    const [keyEntry] = await this.storeEntries([{ name, data, meta }]);
    return keyEntry;
  }

  async updateEntry(name: string, data: string, meta?: Meta): Promise<void> {
    await this.throwUnlessKeyEntryExists(name);
    const cloudEntry = await this.cloudKeyStorage.updateEntry(name, data, meta);
    const keyEntry = createKeyEntry(cloudEntry);
    await this.keyEntryStorageWrapper.update(keyEntry);
  }

  async retrieveEntry(name: string): Promise<IKeyEntry> {
    await this.throwUnlessKeyEntryExists(name);
    return this.keyEntryStorageWrapper.load(name) as Promise<IKeyEntry>;
  }

  retrieveAllEntries(): Promise<IKeyEntry[]> {
    return this.keyEntryStorageWrapper.list();
  }

  existsEntry(name: string): Promise<boolean> {
    return this.keyEntryStorageWrapper.exists(name);
  }

  deleteEntry(name: string): Promise<void> {
    return this.deleteEntries([name]);
  }

  async deleteEntries(names: string[]): Promise<void> {
    await this.cloudKeyStorage.deleteEntries(names);
    const deleteRequests = names.map(name => this.keyEntryStorageWrapper.remove(name));
    await Promise.all(deleteRequests);
  }

  async deleteAllEntries(): Promise<void> {
    await this.cloudKeyStorage.deleteAllEntries();
    await this.keyEntryStorageWrapper.clear();
  }

  async updateRecipients(options: {
    newPrivateKey?: IPrivateKey;
    newPublicKeys?: IPublicKey | IPublicKey[];
  }): Promise<void> {
    const { newPrivateKey, newPublicKeys } = options;
    return this.cloudKeyStorage.updateRecipients({ newPrivateKey, newPublicKeys });
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
    const keyEntries = await this.keyEntryStorageWrapper.list();
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
    const exists = await this.keyEntryStorageWrapper.exists(name);
    if (!exists) {
      throw new KeyEntryDoesntExistError(name);
    }
  }

  private async throwIfKeyEntryExists(name: string): Promise<void> {
    const exists = await this.keyEntryStorageWrapper.exists(name);
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
      await this.keyEntryStorageWrapper.remove(name);
    });
    const updateRequests = updateNames.map(async name => {
      const cloudEntry = this.cloudKeyStorage.retrieveEntry(name);
      const keyEntry = createKeyEntry(cloudEntry);
      await this.keyEntryStorageWrapper.update(keyEntry);
    });
    const storeRequests = storeNames.map(async name => {
      const cloudEntry = this.cloudKeyStorage.retrieveEntry(name);
      const keyEntry = createKeyEntry(cloudEntry);
      await this.keyEntryStorageWrapper.save(keyEntry);
    });
    await Promise.all([...deleteRequests, ...updateRequests, ...storeRequests]);
  }
}

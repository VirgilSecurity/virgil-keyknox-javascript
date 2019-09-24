import { IKeyEntry, IKeyEntryStorage, ISaveKeyEntryParams, IUpdateKeyEntryParams } from './types';

export class KeyEntryStorageWrapper {
  private readonly prefix: string;
  private readonly prefixRegExp: RegExp;
  private readonly keyEntryStorage: IKeyEntryStorage;

  constructor(identity: string, keyEntryStorage: IKeyEntryStorage) {
    this.prefix = `_VIRGIL_IDENTITY=${identity}.`;
    this.prefixRegExp = new RegExp(`^${this.prefix}`);
    this.keyEntryStorage = keyEntryStorage;
  }

  async save(params: ISaveKeyEntryParams): Promise<IKeyEntry> {
    const keyEntry = await this.keyEntryStorage.save({
      ...params,
      name: this.getKeyEntryName(params.name),
    });
    return this.formatKeyEntry(keyEntry);
  }

  async load(name: string): Promise<IKeyEntry | null> {
    const keyEntry = await this.keyEntryStorage.load(this.getKeyEntryName(name));
    if (keyEntry === null) {
      return null;
    }
    return this.formatKeyEntry(keyEntry);
  }

  exists(name: string): Promise<boolean> {
    return this.keyEntryStorage.exists(this.getKeyEntryName(name));
  }

  remove(name: string): Promise<boolean> {
    return this.keyEntryStorage.remove(this.getKeyEntryName(name));
  }

  async list(): Promise<IKeyEntry[]> {
    const keyEntries = await this.getAllKeyEntries();
    return keyEntries.map(this.formatKeyEntry);
  }

  async update(params: IUpdateKeyEntryParams): Promise<IKeyEntry> {
    const keyEntry = await this.keyEntryStorage.update({
      ...params,
      name: this.getKeyEntryName(params.name),
    });
    return this.formatKeyEntry(keyEntry);
  }

  async clear(): Promise<void> {
    const keyEntries = await this.getAllKeyEntries();
    for (const keyEntry of keyEntries) {
      await this.keyEntryStorage.remove(keyEntry.name);
    }
  }

  private getKeyEntryName(name: string): string {
    return `${this.prefix}${name}`;
  }

  private formatKeyEntry = (keyEntry: IKeyEntry): IKeyEntry => {
    return {
      ...keyEntry,
      name: keyEntry.name.replace(this.prefix, ''),
    };
  };

  private async getAllKeyEntries(): Promise<IKeyEntry[]> {
    const keyEntries = await this.keyEntryStorage.list();
    return keyEntries.filter(keyEntry => this.prefixRegExp.test(keyEntry.name));
  }
}

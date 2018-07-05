import { KeychainEntry } from '../entities';

export default interface IKeyStorage {
  store(name: string, data: Buffer, meta?: { [key: string]: string }): Promise<KeychainEntry>;

  updateEntry(name: string, data: Buffer, meta?: { [key: string]: string }): Promise<void>;

  retrieveEntry(name: string): Promise<KeychainEntry>;

  retrieveAllEntries(): Promise<KeychainEntry[]>;

  deleteEntry(name: string): Promise<void>;

  existsEntry(name: string): Promise<boolean>;
}

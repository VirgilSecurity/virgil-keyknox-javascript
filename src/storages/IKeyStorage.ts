import { KeychainEntry } from '../entities';
import { Data, Meta } from '../types';

export default interface IKeyStorage {
  store(name: string, data: Data, meta?: Meta): Promise<KeychainEntry>;

  updateEntry(name: string, data: Data, meta?: Meta): Promise<void>;

  retrieveEntry(name: string): Promise<KeychainEntry>;

  retrieveAllEntries(): Promise<KeychainEntry[]>;

  deleteEntry(name: string): Promise<void>;

  existsEntry(name: string): Promise<boolean>;
}

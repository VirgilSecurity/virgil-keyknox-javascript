import { CloudEntry, KeychainEntry } from './entities';

const creationDateKey = 'k_cda';
const modificationDateKey = 'k_mda';

export function createKeychainEntry(cloudEntry: CloudEntry): KeychainEntry {
  return {
    name: cloudEntry.name,
    data: cloudEntry.data,
    meta: {
      ...cloudEntry.meta,
      [creationDateKey]: Number(cloudEntry.creationDate),
      [modificationDateKey]: Number(cloudEntry.modificationDate),
    },
  };
}

export function extractDates(
  keychainEntry: KeychainEntry,
): {
  creationDate: Date;
  modificationDate: Date;
} {
  const creationDate = new Date(keychainEntry.meta[creationDateKey]);
  const modificationDate = new Date(keychainEntry.meta[creationDateKey]);
  return { creationDate, modificationDate };
}

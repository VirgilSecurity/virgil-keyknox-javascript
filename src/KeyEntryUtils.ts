import { IKeyEntry } from 'virgil-sdk/dist/types/Sdk/Lib/KeyStorage/IKeyStorage';

import { CloudEntry } from './entities';

const creationDateKey = 'k_cda';
const modificationDateKey = 'k_mda';

export function createKeyEntry(cloudEntry: CloudEntry): IKeyEntry {
  return {
    name: cloudEntry.name,
    value: cloudEntry.data,
    meta: {
      ...cloudEntry.meta,
      [creationDateKey]: cloudEntry.creationDate.toString(),
      [modificationDateKey]: cloudEntry.modificationDate.toString(),
    },
  };
}

export function extractDate(
  keyEntry: IKeyEntry,
): {
  creationDate: Date;
  modificationDate: Date;
} {
  if (!keyEntry.meta) {
    throw new Error();
  }
  const creationDate = new Date(keyEntry.meta[creationDateKey]);
  const modificationDate = new Date(keyEntry.meta[creationDateKey]);
  return { creationDate, modificationDate };
}

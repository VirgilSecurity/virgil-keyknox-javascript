import { IKeyEntry } from 'virgil-sdk';

import { CloudEntry } from './entities';

export const creationDateKey = 'k_cda';
export const modificationDateKey = 'k_mda';

export function createKeyEntry(
  cloudEntry: CloudEntry,
): {
  name: string;
  value: Buffer;
  meta: { [key: string]: string };
} {
  return {
    name: cloudEntry.name,
    value: cloudEntry.data,
    meta: {
      ...cloudEntry.meta,
      [creationDateKey]: cloudEntry.creationDate.toISOString(),
      [modificationDateKey]: cloudEntry.modificationDate.toISOString(),
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
    throw new TypeError("Invalid 'IKeyEntry'");
  }
  const creationDate = new Date(keyEntry.meta[creationDateKey]);
  const modificationDate = new Date(keyEntry.meta[modificationDateKey]);
  return { creationDate, modificationDate };
}

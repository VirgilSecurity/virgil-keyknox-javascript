import { IKeyEntry, CloudEntry } from './types';

export const creationDateKey = 'k_cda';
export const modificationDateKey = 'k_mda';

export function createKeyEntry(
  cloudEntry: CloudEntry,
): {
  name: string;
  value: string;
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

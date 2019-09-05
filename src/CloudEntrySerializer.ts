import base64 from 'base-64';

import { CloudEntry } from './entities';
import { Meta } from './types';

interface SerializedCloudEntry {
  name: string;
  data: string;
  creation_date: number;
  modification_date: number;
  meta?: Meta | null;
}

export function serialize(cloudEntries: Map<string, CloudEntry>) {
  const entries: { [key: string]: SerializedCloudEntry } = {};
  cloudEntries.forEach((value, key) => {
    entries[key] = {
      data: value.data,
      meta: value.meta,
      // eslint-disable-next-line @typescript-eslint/camelcase
      creation_date: Number(value.creationDate),
      name: value.name,
      // eslint-disable-next-line @typescript-eslint/camelcase
      modification_date: Number(value.modificationDate),
    };
    if (entries[key].meta === null) {
      delete entries[key].meta;
    }
  });
  return base64.encode(JSON.stringify(entries));
}

export function deserialize(data: string): Map<string, CloudEntry> {
  const myData = base64.decode(data);
  if (!myData.length) {
    return new Map();
  }
  const serializedEntries: { [key: string]: SerializedCloudEntry } = JSON.parse(myData);
  return Object.keys(serializedEntries).reduce<Map<string, CloudEntry>>((result, key) => {
    const serializedEntry = serializedEntries[key];
    result.set(key, {
      name: serializedEntry.name,
      data: serializedEntry.data,
      creationDate: new Date(serializedEntry.creation_date),
      modificationDate: new Date(serializedEntry.modification_date),
      meta: typeof serializedEntry.meta === 'undefined' ? null : serializedEntry.meta,
    });
    return result;
  }, new Map());
}

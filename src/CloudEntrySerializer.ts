import { Buffer as NodeBuffer } from 'buffer';

import { CloudEntry } from './entities';
import { Meta } from './types';

interface SerializedCloudEntry {
  name: string;
  data: string;
  creation_date: number;
  modification_date: number;
  meta?: Meta | null;
}

export function serialize(cloudEntries: Map<string, CloudEntry>): Buffer {
  const entries: { [key: string]: SerializedCloudEntry } = {};
  cloudEntries.forEach((value, key) => {
    entries[key] = {
      data: value.data.toString('base64'),
      meta: value.meta,
      creation_date: Number(value.creationDate),
      name: value.name,
      modification_date: Number(value.modificationDate),
    };
    if (entries[key].meta === null) {
      delete entries[key].meta;
    }
  });
  return NodeBuffer.from(JSON.stringify(entries));
}

export function deserialize(data: Buffer): Map<string, CloudEntry> {
  if (!data.byteLength) {
    return new Map();
  }
  const serializedEntries: { [key: string]: SerializedCloudEntry } = JSON.parse(data.toString());
  return Object.keys(serializedEntries).reduce<Map<string, CloudEntry>>((result, key) => {
    const serializedEntry = serializedEntries[key];
    result.set(key, {
      name: serializedEntry.name,
      data: NodeBuffer.from(serializedEntry.data, 'base64'),
      creationDate: new Date(serializedEntry.creation_date),
      modificationDate: new Date(serializedEntry.modification_date),
      meta: typeof serializedEntry.meta === 'undefined' ? null : serializedEntry.meta,
    });
    return result;
  }, new Map());
}

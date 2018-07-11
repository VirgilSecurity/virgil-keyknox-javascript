import { CloudEntry } from './entities';
import { Meta } from './types';

interface SerializedCloudEntry {
  name: string;
  data: string;
  creation_date: number;
  modification_date: number;
  meta?: Meta | null;
}

export function serialize(cloudEntries: { [key: string]: CloudEntry }): Buffer {
  const entries = Object.keys(cloudEntries).reduce<{ [key: string]: SerializedCloudEntry }>(
    (result, key) => {
      const cloudEntry = cloudEntries[key];
      result[key] = {
        data: cloudEntry.data.toString('base64'),
        meta: cloudEntry.meta,
        creation_date: Number(cloudEntry.creationDate),
        name: cloudEntry.name,
        modification_date: Number(cloudEntry.modificationDate),
      };
      if (result[key].meta === null) {
        delete result[key].meta;
      }
      return result;
    },
    {},
  );
  return Buffer.from(JSON.stringify(entries));
}

export function deserialize(data: Buffer): { [key: string]: CloudEntry } {
  if (!data.byteLength) {
    return {};
  }
  const serializedEntries: { [key: string]: SerializedCloudEntry } = JSON.parse(data.toString());
  return Object.keys(serializedEntries).reduce<{ [key: string]: CloudEntry }>((result, key) => {
    const serializedEntry = serializedEntries[key];
    result[key] = {
      name: serializedEntry.name,
      data: Buffer.from(serializedEntry.data, 'base64'),
      creationDate: new Date(serializedEntry.creation_date),
      modificationDate: new Date(serializedEntry.modification_date),
      meta: typeof serializedEntry.meta === 'undefined' ? null : serializedEntry.meta,
    };
    return result;
  }, {});
}

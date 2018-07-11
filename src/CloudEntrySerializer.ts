import { CloudEntry } from './entities';
import { Meta } from './types';

interface SerializedCloudEntry {
  name: string;
  data: string;
  creation_date: number;
  modification_date: number;
  meta?: Meta;
}

export function serialize(cloudEntries: { [key: string]: CloudEntry }): Buffer {
  const entries = Object.keys(cloudEntries).reduce<{ [key: string]: SerializedCloudEntry }>(
    (result, key) => {
      const cloudEntry = cloudEntries[key];
      result[key] = {
        name: cloudEntry.name,
        data: cloudEntry.data.toString('base64'),
        creation_date: Number(cloudEntry.creationDate),
        modification_date: Number(cloudEntry.modificationDate),
        meta: cloudEntry.meta,
      };
      return result;
    },
    {},
  );
  return Buffer.from(JSON.stringify(entries));
}

export function deserialize(data: Buffer): { [key: string]: CloudEntry } {
  const serializedEntries: { [key: string]: SerializedCloudEntry } = JSON.parse(data.toString());
  return Object.keys(serializedEntries).reduce<{ [key: string]: CloudEntry }>((result, key) => {
    const serializedEntry = serializedEntries[key];
    result[key] = {
      name: serializedEntry.name,
      data: Buffer.from(serializedEntry.data, 'base64'),
      creationDate: new Date(serializedEntry.creation_date),
      modificationDate: new Date(serializedEntry.modification_date),
      meta: serializedEntry.meta,
    };
    return result;
  }, {});
}

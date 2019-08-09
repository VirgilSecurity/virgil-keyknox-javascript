import { Meta } from './types';

export interface KeyknoxValue {
  meta: Buffer;
  value: Buffer;
  version: string;
  keyknoxHash: Buffer;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DecryptedKeyknoxValue extends KeyknoxValue {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EncryptedKeyknoxValue extends KeyknoxValue {}

export interface CloudEntry {
  name: string;
  data: Buffer;
  creationDate: Date;
  modificationDate: Date;
  meta: Meta;
}

export interface KeyEntry {
  name: string;
  data: Buffer;
  meta?: Meta;
}

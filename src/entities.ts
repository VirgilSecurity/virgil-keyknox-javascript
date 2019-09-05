import { Meta } from './types';

export interface KeyknoxValue {
  meta: string;
  value: string;
  version: string;
  keyknoxHash: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DecryptedKeyknoxValue extends KeyknoxValue {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EncryptedKeyknoxValue extends KeyknoxValue {}

export interface CloudEntry {
  name: string;
  data: string;
  creationDate: Date;
  modificationDate: Date;
  meta: Meta;
}

export interface KeyEntry {
  name: string;
  data: string;
  meta?: Meta;
}

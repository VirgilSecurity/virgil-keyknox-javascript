import { Data, Meta } from './types';

interface KeyknoxValue {
  meta: Buffer;
  value: Buffer;
  version: string;
  keyknoxHash: Buffer;
}

export interface DecryptedKeyknoxValue extends KeyknoxValue {}

export interface EncryptedKeyknoxValue extends KeyknoxValue {}

export interface CloudEntry {
  name: string;
  data: Data;
  creationDate: Date;
  modificationDate: Date;
  meta?: Meta;
}

export interface KeyEntry {
  name: string;
  data: Data;
  meta?: Meta;
}

export interface KeychainEntry {
  name: string;
  data: Data;
  meta: Meta;
}

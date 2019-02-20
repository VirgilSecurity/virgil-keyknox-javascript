import { Meta } from './types';

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

export interface KeyknoxData {
  meta: string;
  value: string;
  version: string;
}

interface KeyknoxValue {
  meta: Buffer;
  value: Buffer;
  version: string;
  keyknoxHash: Buffer;
}

export interface DecryptedKeyknoxValue extends KeyknoxValue {}

export interface EncryptedKeyknoxValue extends KeyknoxValue {}

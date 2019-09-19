export type Meta = { [key: string]: string } | null;

export type AxiosInstance = import('axios').AxiosInstance;
export type AxiosError = import('axios').AxiosError;
export type AxiosRequestConfig = import('axios').AxiosRequestConfig;

export type ICrypto = import('@virgilsecurity/crypto-types').ICrypto;
export type IPrivateKey = import('@virgilsecurity/crypto-types').IPrivateKey;
export type IPublicKey = import('@virgilsecurity/crypto-types').IPublicKey;

export type IAccessTokenProvider = import('virgil-sdk').IAccessTokenProvider;
export type IAccessToken = import('virgil-sdk').IAccessToken;
export type IKeyEntry = import('virgil-sdk').IKeyEntry;
export type IKeyEntryStorage = import('virgil-sdk').IKeyEntryStorage;
export type ISaveKeyEntryParams = import('virgil-sdk').ISaveKeyEntryParams;
export type IUpdateKeyEntryParams = import('virgil-sdk').IUpdateKeyEntryParams;

export interface KeyknoxValueV1 {
  meta: string;
  value: string;
  version: string;
  keyknoxHash: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DecryptedKeyknoxValueV1 extends KeyknoxValueV1 {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EncryptedKeyknoxValueV1 extends KeyknoxValueV1 {}

export interface KeyknoxValueV2 {
  owner: string;
  root: string;
  path: string;
  key: string;
  identities: string[];
  meta: string;
  value: string;
  version: string;
  keyknoxHash: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DecryptedKeyknoxValueV2 extends KeyknoxValueV2 {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EncryptedKeyknoxValueV2 extends KeyknoxValueV2 {}

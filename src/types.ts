export type Meta = { [key: string]: string } | null;

export type AxiosInstance = import('axios').AxiosInstance;
export type AxiosError = import('axios').AxiosError;
export type AxiosRequestConfig = import('axios').AxiosRequestConfig;

export type ICrypto = import('@virgilsecurity/crypto-types').ICrypto;
export type IPrivateKey = import('@virgilsecurity/crypto-types').IPrivateKey;
export type IPublicKey = import('@virgilsecurity/crypto-types').IPublicKey;

export type IAccessTokenProvider = import('virgil-sdk').IAccessTokenProvider;
export type IKeyEntry = import('virgil-sdk').IKeyEntry;
export type IKeyEntryStorage = import('virgil-sdk').IKeyEntryStorage;
export type ISaveKeyEntryParams = import('virgil-sdk').ISaveKeyEntryParams;
export type IUpdateKeyEntryParams = import('virgil-sdk').IUpdateKeyEntryParams;

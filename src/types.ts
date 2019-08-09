export type Meta = { [key: string]: string } | null;

export type IPrivateKey = import('virgil-crypto').IPrivateKey;
export type IPublicKey = import('virgil-crypto').IPublicKey;
export type VirgilCrypto = import('virgil-crypto').VirgilCrypto;
export type VirgilPrivateKey = import('virgil-crypto').VirgilPrivateKey;
export type VirgilPublicKey = import('virgil-crypto').VirgilPublicKey;

export type IAccessTokenProvider = import('virgil-sdk').IAccessTokenProvider;
export type IKeyEntry = import('virgil-sdk').IKeyEntry;
export type IKeyEntryStorage = import('virgil-sdk').IKeyEntryStorage;
export type ISaveKeyEntryParams = import('virgil-sdk').ISaveKeyEntryParams;
export type IUpdateKeyEntryParams = import('virgil-sdk').IUpdateKeyEntryParams;

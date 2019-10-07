import axios, { AxiosResponse } from 'axios';
import { VirgilAgent } from 'virgil-sdk';

import { version } from '../package.json';
import { KeyknoxClientError } from './errors';
import {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  IAccessTokenProvider,
  IAccessToken,
  KeyknoxValueV1,
  EncryptedKeyknoxValueV1,
  DecryptedKeyknoxValueV1,
  KeyknoxValueV2,
  EncryptedKeyknoxValueV2,
  DecryptedKeyknoxValueV2,
} from './types';

interface KeyknoxDataV1 {
  meta: string;
  value: string;
  version: string;
}

interface KeyknoxDataV2 {
  owner: string;
  root: string;
  path: string;
  key: string;
  identities: string[];
  meta: string;
  value: string;
  version: string;
}

type GetKeysResponse = string[];

export class KeyknoxClient {
  private static readonly API_URL = 'https://api.virgilsecurity.com';
  private static readonly AUTHORIZATION_PREFIX = 'Virgil';
  private static readonly SERVICE_NAME = 'keyknox';

  private readonly accessTokenProvider: IAccessTokenProvider;
  private readonly axios: AxiosInstance;
  private readonly virgilAgent: VirgilAgent;

  constructor(
    accessTokenProvider: IAccessTokenProvider,
    apiUrl?: string,
    axiosInstance?: AxiosInstance,
    virgilAgent?: VirgilAgent,
  ) {
    this.accessTokenProvider = accessTokenProvider;
    this.axios = axiosInstance || axios.create({ baseURL: apiUrl || KeyknoxClient.API_URL });
    this.virgilAgent = virgilAgent || new VirgilAgent('keyknox', version);
    this.axios.interceptors.response.use(undefined, KeyknoxClient.responseErrorHandler);
  }

  async v1Push(meta: string, value: string, keyknoxHash?: string) {
    const data = {
      meta,
      value,
    };
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'put',
    });
    const requestConfig: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({
        accessToken,
        keyknoxHash,
        virgilAgent: this.virgilAgent,
      }),
    };
    const response = await this.axios.put<KeyknoxDataV1>('/keyknox/v1', data, requestConfig);
    return KeyknoxClient.getKeyknoxValueV1(response) as EncryptedKeyknoxValueV1;
  }

  async v1Pull() {
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'get',
    });
    const requestConfig = {
      headers: KeyknoxClient.getHeaders({ accessToken, virgilAgent: this.virgilAgent }),
    };
    const response = await this.axios.get<KeyknoxDataV1>('/keyknox/v1', requestConfig);
    return KeyknoxClient.getKeyknoxValueV1(response) as EncryptedKeyknoxValueV1;
  }

  async v1Reset() {
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'delete',
    });
    const requestConfig = {
      headers: KeyknoxClient.getHeaders({ accessToken, virgilAgent: this.virgilAgent }),
    };
    const response = await this.axios.post<KeyknoxDataV1>(
      '/keyknox/v1/reset',
      undefined,
      requestConfig,
    );
    return KeyknoxClient.getKeyknoxValueV1(response) as DecryptedKeyknoxValueV1;
  }

  async v2Push(options: {
    root: string;
    path: string;
    key: string;
    identities: string[];
    meta: string;
    value: string;
    keyknoxHash?: string;
  }) {
    const { root, path, key, identities, meta, value, keyknoxHash } = options;
    const data = {
      root,
      path,
      key,
      identities,
      meta,
      value,
    };
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'put',
    });
    const requestConfig: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({
        accessToken,
        keyknoxHash,
        virgilAgent: this.virgilAgent,
      }),
    };
    const response = await this.axios.post('/keyknox/v2/push', data, requestConfig);
    return KeyknoxClient.getKeyknoxValueV2(response) as EncryptedKeyknoxValueV2;
  }

  async v2Pull(options: { root: string; path: string; key: string; identity?: string }) {
    const { root, path, key, identity } = options;
    const data = {
      root,
      path,
      key,
      identity,
    };
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'get',
    });
    const requestConfig: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({ accessToken, virgilAgent: this.virgilAgent }),
    };
    const response = await this.axios.post('/keyknox/v2/pull', data, requestConfig);
    return KeyknoxClient.getKeyknoxValueV2(response) as EncryptedKeyknoxValueV2;
  }

  async v2GetKeys(options: { root?: string; path?: string; identity?: string }) {
    const { root, path, identity } = options;
    const data = {
      root,
      path,
      identity,
    };
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'get',
    });
    const requestConfig: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({ accessToken, virgilAgent: this.virgilAgent }),
    };
    const response = await this.axios.post<GetKeysResponse>(
      '/keyknox/v2/keys',
      data,
      requestConfig,
    );
    return response.data;
  }

  async v2Reset(options: { root?: string; path?: string; key?: string; identity?: string }) {
    const { root, path, key, identity } = options;
    const data = {
      root,
      path,
      key,
      identity,
    };
    const accessToken = await this.accessTokenProvider.getToken({
      service: KeyknoxClient.SERVICE_NAME,
      operation: 'delete',
    });
    const requestConfig: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({ accessToken, virgilAgent: this.virgilAgent }),
    };
    const response = await this.axios.post('/keyknox/v2/reset', data, requestConfig);
    return KeyknoxClient.getKeyknoxValueV2(response) as DecryptedKeyknoxValueV2;
  }

  private static getKeyknoxValueV1(response: AxiosResponse<KeyknoxDataV1>): KeyknoxValueV1 {
    const { data, headers } = response;
    return {
      meta: data.meta,
      value: data.value,
      version: data.version,
      keyknoxHash: headers['virgil-keyknox-hash'],
    };
  }

  private static getKeyknoxValueV2(response: AxiosResponse<KeyknoxDataV2>): KeyknoxValueV2 {
    const { data, headers } = response;
    return {
      owner: data.owner,
      root: data.root,
      path: data.path,
      key: data.key,
      identities: data.identities,
      meta: data.meta,
      value: data.value,
      keyknoxHash: headers['virgil-keyknox-hash'],
    };
  }

  private static getAuthorizationHeader(accessToken: IAccessToken) {
    return `${KeyknoxClient.AUTHORIZATION_PREFIX} ${accessToken.toString()}`;
  }

  private static getHeaders(options: {
    virgilAgent: VirgilAgent;
    accessToken?: IAccessToken;
    keyknoxHash?: string;
  }) {
    const { virgilAgent, accessToken, keyknoxHash } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers: any = {
      'Virgil-Agent': virgilAgent.value,
    };
    if (accessToken) {
      headers.Authorization = KeyknoxClient.getAuthorizationHeader(accessToken);
    }
    if (keyknoxHash) {
      headers['Virgil-Keyknox-Previous-Hash'] = keyknoxHash;
    }
    return headers;
  }

  private static responseErrorHandler(error: AxiosError) {
    const { response } = error;
    if (response) {
      const { data } = response;
      if (data && data.code && data.message) {
        return Promise.reject(new KeyknoxClientError(data.message, response.status, data.code));
      }
      return Promise.reject(new KeyknoxClientError(error.message, response.status));
    }
    return Promise.reject(new KeyknoxClientError(error.message));
  }
}

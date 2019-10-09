import axios, { AxiosResponse } from 'axios';
import { VirgilAgent } from 'virgil-sdk';

import { version } from '../../package.json';
import { EncryptedKeyknoxValue, DecryptedKeyknoxValue, KeyknoxValue } from '../entities';
import { KeyknoxClientError } from '../errors';
import { AxiosInstance, AxiosError, AxiosRequestConfig } from '../types';
import IKeyknoxClient from './IKeyknoxClient';

interface KeyknoxData {
  meta: string;
  value: string;
  version: string;
}

export default class KeyknoxClient implements IKeyknoxClient {
  private static readonly API_URL = 'https://api.virgilsecurity.com';
  private static readonly PRODUCT_NAME = 'keyknox';

  private readonly axios: AxiosInstance;
  private readonly virgilAgent: VirgilAgent;

  constructor(apiUrl?: string, axiosInstance?: AxiosInstance, virgilAgent?: VirgilAgent) {
    this.axios = axiosInstance || axios.create({ baseURL: apiUrl || KeyknoxClient.API_URL });
    this.virgilAgent = virgilAgent || new VirgilAgent(KeyknoxClient.PRODUCT_NAME, version);
    this.axios.interceptors.response.use(undefined, KeyknoxClient.responseErrorHandler);
  }

  async pushValue(
    meta: string,
    value: string,
    token: string,
    previousHash?: string,
  ): Promise<EncryptedKeyknoxValue> {
    const payload = {
      meta,
      value,
    };
    const config: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({
        virgilAgent: this.virgilAgent,
        accessToken: token,
        keyknoxHash: previousHash,
      }),
    };
    const response = await this.axios.put<KeyknoxData>('/keyknox/v1', payload, config);
    return KeyknoxClient.getKeyknoxValue(response);
  }

  async pullValue(token: string): Promise<EncryptedKeyknoxValue> {
    const config = {
      headers: KeyknoxClient.getHeaders({
        virgilAgent: this.virgilAgent,
        accessToken: token,
      }),
    };
    const response = await this.axios.get<KeyknoxData>('/keyknox/v1', config);
    return KeyknoxClient.getKeyknoxValue(response);
  }

  async resetValue(token: string): Promise<DecryptedKeyknoxValue> {
    const config: AxiosRequestConfig = {
      headers: KeyknoxClient.getHeaders({
        virgilAgent: this.virgilAgent,
        accessToken: token,
      }),
    };
    const response = await this.axios.post<KeyknoxData>('/keyknox/v1/reset', null, config);
    return KeyknoxClient.getKeyknoxValue(response);
  }

  private static getKeyknoxValue(response: AxiosResponse<KeyknoxData>): KeyknoxValue {
    const { data, headers } = response;
    return {
      meta: data.meta,
      value: data.value,
      version: data.version,
      keyknoxHash: headers['virgil-keyknox-hash'],
    };
  }

  private static getHeaders(options: {
    virgilAgent: VirgilAgent;
    accessToken?: string;
    keyknoxHash?: string;
  }) {
    const { virgilAgent, accessToken, keyknoxHash } = options;
    return Object.assign(
      { 'Virgil-Agent': virgilAgent.value },
      accessToken && { Authorization: `Virgil ${accessToken}` },
      keyknoxHash && { 'Virgil-Keyknox-Previous-Hash': keyknoxHash },
    );
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

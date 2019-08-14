import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Buffer as NodeBuffer } from 'buffer';

import { EncryptedKeyknoxValue, DecryptedKeyknoxValue, KeyknoxValue } from '../entities';
import { KeyknoxClientError } from '../errors';
import IKeyknoxClient from './IKeyknoxClient';

interface KeyknoxData {
  meta: string;
  value: string;
  version: string;
}

const DEFAULT_BASE_URL = 'https://api.virgilsecurity.com';

export default class KeyknoxClient implements IKeyknoxClient {
  private static readonly AUTHORIZATION_PREFIX = 'Virgil';

  private readonly axios: AxiosInstance;

  constructor(apiUrl?: string, axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance || axios.create({ baseURL: apiUrl || DEFAULT_BASE_URL });
    this.axios.interceptors.response.use(undefined, KeyknoxClient.responseErrorHandler);
  }

  async pushValue(
    meta: Buffer,
    value: Buffer,
    token: string,
    previousHash?: Buffer,
  ): Promise<EncryptedKeyknoxValue> {
    const payload = {
      meta: meta.toString('base64'),
      value: value.toString('base64'),
    };
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: KeyknoxClient.getAuthorizationHeader(token),
      },
    };
    if (previousHash) {
      config.headers['Virgil-Keyknox-Previous-Hash'] = previousHash.toString('base64');
    }
    const response = await this.axios.put<KeyknoxData>('/keyknox/v1', payload, config);
    return KeyknoxClient.getKeyknoxValue(response);
  }

  async pullValue(token: string): Promise<EncryptedKeyknoxValue> {
    const config = {
      headers: {
        Authorization: KeyknoxClient.getAuthorizationHeader(token),
      },
    };
    const response = await this.axios.get<KeyknoxData>('/keyknox/v1', config);
    return KeyknoxClient.getKeyknoxValue(response);
  }

  async resetValue(token: string): Promise<DecryptedKeyknoxValue> {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: KeyknoxClient.getAuthorizationHeader(token),
      },
    };
    const response = await this.axios.post<KeyknoxData>('/keyknox/v1/reset', null, config);
    return KeyknoxClient.getKeyknoxValue(response);
  }

  private static getKeyknoxValue(response: AxiosResponse<KeyknoxData>): KeyknoxValue {
    const { data, headers } = response;
    return {
      meta: NodeBuffer.from(data.meta, 'base64'),
      value: NodeBuffer.from(data.value, 'base64'),
      version: data.version,
      keyknoxHash: NodeBuffer.from(headers['virgil-keyknox-hash'], 'base64'),
    };
  }

  private static getAuthorizationHeader(token: string) {
    return `${KeyknoxClient.AUTHORIZATION_PREFIX} ${token}`;
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

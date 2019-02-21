import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { EncryptedKeyknoxValue, DecryptedKeyknoxValue, KeyknoxValue } from '../entities';
import { KeyknoxClientError } from '../errors';
import IKeyknoxClient from './IKeyknoxClient';

interface KeyknoxData {
  meta: string;
  value: string;
  version: string;
}

const DEFAULT_BASE_URL: string = 'https://api.virgilsecurity.com';

export default class KeyknoxClient implements IKeyknoxClient {
  private static readonly AUTHORIZATION_PREFIX = 'Virgil';
  static readonly axios = axios.create({ baseURL: DEFAULT_BASE_URL });

  private readonly axios: AxiosInstance;

  constructor(axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance || KeyknoxClient.axios;
    this.axios.interceptors.response.use(undefined, KeyknoxClient.responseErrorHandler);
  }

  static async resetValue(
    token: string,
    axiosInstance: AxiosInstance = KeyknoxClient.axios,
  ): Promise<DecryptedKeyknoxValue> {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: KeyknoxClient.getAuthorizationHeader(token),
      },
    };
    const response = await axiosInstance.post<KeyknoxData>('/keyknox/v1/reset', null, config);
    return this.getKeyknoxValue(response);
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
    return KeyknoxClient.resetValue(token, this.axios);
  }

  private static getKeyknoxValue(response: AxiosResponse<KeyknoxData>): KeyknoxValue {
    const { data, headers } = response;
    return {
      meta: Buffer.from(data.meta, 'base64'),
      value: Buffer.from(data.value, 'base64'),
      version: data.version,
      keyknoxHash: Buffer.from(headers['virgil-keyknox-hash'], 'base64'),
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

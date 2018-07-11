import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { EncryptedKeyknoxValue } from '../entities';
import IKeyknoxClient from './IKeyknoxClient';

interface KeyknoxData {
  meta: string;
  value: string;
  version: string;
}

export default class KeyknoxClient implements IKeyknoxClient {
  static readonly defaultBaseURL: string = 'https://api.virgilsecurity.com';

  private readonly axios: AxiosInstance;

  constructor(axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance || axios.create({ baseURL: KeyknoxClient.defaultBaseURL });
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
        Authorization: `Virgil ${token}`,
      },
    };
    if (previousHash) {
      config.headers['Virgil-Keyknox-Previous-Hash'] = previousHash.toString('base64');
    }
    const response = await this.axios.put<KeyknoxData>('/keyknox/v1', payload, config);
    return KeyknoxClient.getEncryptedKeyknoxValue(response);
  }

  async pullValue(token: string): Promise<EncryptedKeyknoxValue> {
    const config = {
      headers: {
        Authorization: `Virgil ${token}`,
      },
    };
    const response = await this.axios.get<KeyknoxData>('/keyknox/v1', config);
    return KeyknoxClient.getEncryptedKeyknoxValue(response);
  }

  private static getEncryptedKeyknoxValue(
    response: AxiosResponse<KeyknoxData>,
  ): EncryptedKeyknoxValue {
    const { data, headers } = response;
    return {
      meta: Buffer.from(data.meta, 'base64'),
      value: Buffer.from(data.value, 'base64'),
      version: data.version,
      keyknoxHash: Buffer.from(headers['virgil-keyknox-hash'], 'base64'),
    };
  }
}

import { IAccessTokenProvider } from 'virgil-sdk';
import KeyknoxClient from './clients/KeyknoxClient';

export async function resetAllEntries(accessTokenProvider: IAccessTokenProvider) {
  const token = await accessTokenProvider.getToken({ operation: 'delete' });
  return KeyknoxClient.resetValue(token.toString());
}

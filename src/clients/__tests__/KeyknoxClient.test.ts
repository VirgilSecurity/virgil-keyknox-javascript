import { VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { Jwt, JwtGenerator } from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import KeyknoxClient from '../KeyknoxClient';

describe('KeyknoxClient', () => {
  let client: KeyknoxClient;
  let jwt: Jwt;

  beforeEach(() => {
    client = new KeyknoxClient();
    const virgilCrypto = new VirgilCrypto();
    const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
    const apiKey = virgilCrypto.importPrivateKey(process.env.API_KEY!);
    const jwtGenerator = new JwtGenerator({
      apiKey,
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: virgilAccessTokenSigner,
    });
    jwt = jwtGenerator.generateToken(uuid());
  });

  test('KTC-1', async () => {
    expect.assertions(8);
    const value = Buffer.from('value');
    const meta = Buffer.from('meta');
    const token = jwt.toString();
    const response1 = await client.pushValue(meta, value, token);
    const response2 = await client.pullValue(token);
    expect(response1.meta).toEqual(meta);
    expect(response1.value).toEqual(value);
    expect(response1.version).toBe('1.0');
    expect(response1.keyknoxHash).toBeDefined();
    expect(response2.meta).toEqual(meta);
    expect(response2.value).toEqual(value);
    expect(response2.version).toBe('1.0');
    expect(response2.keyknoxHash).toEqual(response1.keyknoxHash);
  });

  test('KTC-2', async () => {
    expect.assertions(4);
    const value1 = Buffer.from('value1');
    const meta1 = Buffer.from('meta1');
    const value2 = Buffer.from('value2');
    const meta2 = Buffer.from('meta2');
    const token = jwt.toString();
    const response1 = await client.pushValue(meta1, value1, token);
    const response2 = await client.pushValue(meta2, value2, token, response1.keyknoxHash);
    expect(response2.meta).toEqual(meta2);
    expect(response2.value).toEqual(value2);
    expect(response2.version).toBe('2.0');
    expect(response2.keyknoxHash).toBeDefined();
  });

  test('KTC-3', async () => {
    expect.assertions(3);
    const response = await client.pullValue(jwt.toString());
    expect(response.meta.byteLength).toBe(0);
    expect(response.value.byteLength).toBe(0);
    expect(response.version).toBe('1.0');
  });

  test('KTC-4', async () => {
    expect.assertions(3);
    const value1 = Buffer.from('value1');
    const meta1 = Buffer.from('meta1');
    const token = jwt.toString();
    await client.pushValue(meta1, value1, token);
    const response2 = await client.resetValue(token);
    expect(response2.meta).toBe('');
    expect(response2.value).toBe('');
    expect(response2.version).toBe('2.0');
  });

  test('KTC-5', async () => {
    expect.assertions(3);
    const response = await client.resetValue(jwt.toString());
    expect(response.meta).toBe('');
    expect(response.value).toBe('');
    expect(response.version).toBe('1.0');
  });
});

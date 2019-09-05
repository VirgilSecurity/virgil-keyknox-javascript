import { expect } from 'chai';

import { initCrypto, VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { Jwt, JwtGenerator } from 'virgil-sdk';
import uuid from 'uuid/v4';

import KeyknoxClient from '../KeyknoxClient';

describe('KeyknoxClient', () => {
  let client: KeyknoxClient;
  let jwt: Jwt;

  before(async () => {
    await initCrypto();
  });

  beforeEach(() => {
    client = new KeyknoxClient(process.env.API_URL);
    const virgilCrypto = new VirgilCrypto();
    const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
    const apiKey = virgilCrypto.importPrivateKey({
      value: process.env.API_KEY!,
      encoding: 'base64',
    });
    const jwtGenerator = new JwtGenerator({
      apiKey,
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: virgilAccessTokenSigner,
    });
    jwt = jwtGenerator.generateToken(uuid());
  });

  it('KTC-1', async () => {
    const value = 'dmFsdWU=';
    const meta = 'bWV0YQ==';
    const token = jwt.toString();
    const response1 = await client.pushValue(meta, value, token);
    const response2 = await client.pullValue(token);
    expect(response1.meta).to.equal(meta);
    expect(response1.value).to.equal(value);
    expect(response1.version).to.equal('1.0');
    expect(response1.keyknoxHash).not.to.be.undefined;
    expect(response2.meta).to.equal(meta);
    expect(response2.value).to.equal(value);
    expect(response2.version).to.equal('1.0');
    expect(response2.keyknoxHash).to.equal(response1.keyknoxHash);
  });

  it('KTC-2', async () => {
    const value1 = 'dmFsdWUx';
    const meta1 = 'bWV0YTE=';
    const value2 = 'dmFsdWUy';
    const meta2 = 'bWV0YTI=';
    const token = jwt.toString();
    const response1 = await client.pushValue(meta1, value1, token);
    const response2 = await client.pushValue(meta2, value2, token, response1.keyknoxHash);
    expect(response2.meta).to.equal(meta2);
    expect(response2.value).to.equal(value2);
    expect(response2.version).to.equal('2.0');
    expect(response2.keyknoxHash).not.to.be.undefined;
  });

  it('KTC-3', async () => {
    const response = await client.pullValue(jwt.toString());
    expect(response.meta.length).to.equal(0);
    expect(response.version).to.equal('1.0');
  });

  it('KTC-4', async () => {
    const value1 = 'dmFsdWUx';
    const meta1 = 'bWV0YTE=';
    const token = jwt.toString();
    await client.pushValue(meta1, value1, token);
    const response2 = await client.resetValue(token);
    expect(response2.meta.length).to.equal(0);
    expect(response2.value.length).to.equal(0);
    expect(response2.version).to.equal('2.0');
  });

  it('KTC-5', async () => {
    const response = await client.resetValue(jwt.toString());
    expect(response.meta.length).to.equal(0);
    expect(response.value.length).to.equal(0);
    expect(response.version).to.equal('1.0');
  });
});

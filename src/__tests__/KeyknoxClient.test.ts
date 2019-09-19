import { expect } from 'chai';
import uuid from 'uuid/v4';

import { initCrypto, VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider } from 'virgil-sdk';

import { KeyknoxClient } from '../KeyknoxClient';

describe('KeyknoxClient', () => {
  let client: KeyknoxClient;
  let identity: string;

  before(async () => {
    await initCrypto();
  });

  beforeEach(() => {
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
    identity = uuid();
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, identity);
    client = new KeyknoxClient(accessTokenProvider, process.env.API_URL);
  });

  it('KTC-1', async () => {
    const value = 'dmFsdWU=';
    const meta = 'bWV0YQ==';
    const response1 = await client.v1Push(meta, value);
    const response2 = await client.v1Pull();
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
    const response1 = await client.v1Push(meta1, value1);
    const response2 = await client.v1Push(meta2, value2, response1.keyknoxHash);
    expect(response2.meta).to.equal(meta2);
    expect(response2.value).to.equal(value2);
    expect(response2.version).to.equal('2.0');
    expect(response2.keyknoxHash).not.to.be.undefined;
  });

  it('KTC-3', async () => {
    const response = await client.v1Pull();
    expect(response.meta.length).to.equal(0);
    expect(response.version).to.equal('1.0');
  });

  it('KTC-4', async () => {
    const value1 = 'dmFsdWUx';
    const meta1 = 'bWV0YTE=';
    await client.v1Push(meta1, value1);
    const response2 = await client.v1Reset();
    expect(response2.meta.length).to.equal(0);
    expect(response2.value.length).to.equal(0);
    expect(response2.version).to.equal('2.0');
  });

  it('KTC-5', async () => {
    const response = await client.v1Reset();
    expect(response.meta.length).to.equal(0);
    expect(response.value.length).to.equal(0);
    expect(response.version).to.equal('1.0');
  });
});

import { Buffer as NodeBuffer } from 'buffer';
import { expect } from 'chai';

import { initCrypto, VirgilCrypto, VirgilAccessTokenSigner } from 'virgil-crypto';
import { Jwt, JwtGenerator } from 'virgil-sdk';
import uuid from 'uuid/v4';

import KeyknoxClient from '../KeyknoxClient';

describe('KeyknoxClient', () => {
  let client: KeyknoxClient;
  let jwt: Jwt;

  beforeEach(async () => {
    await initCrypto();
    client = new KeyknoxClient();
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
    const value = NodeBuffer.from('value');
    const meta = NodeBuffer.from('meta');
    const token = jwt.toString();
    const response1 = await client.pushValue(meta, value, token);
    const response2 = await client.pullValue(token);
    expect(response1.meta.equals(meta)).to.be.true;
    expect(response1.value.equals(value)).to.be.true;
    expect(response1.version).to.equal('1.0');
    expect(response1.keyknoxHash).not.to.be.undefined;
    expect(response2.meta.equals(meta)).to.be.true;
    expect(response2.value.equals(value)).to.be.true;
    expect(response2.version).to.equal('1.0');
    expect(response2.keyknoxHash.equals(response1.keyknoxHash)).to.be.true;
  });

  it('KTC-2', async () => {
    const value1 = NodeBuffer.from('value1');
    const meta1 = NodeBuffer.from('meta1');
    const value2 = NodeBuffer.from('value2');
    const meta2 = NodeBuffer.from('meta2');
    const token = jwt.toString();
    const response1 = await client.pushValue(meta1, value1, token);
    const response2 = await client.pushValue(meta2, value2, token, response1.keyknoxHash);
    expect(response2.meta.equals(meta2)).to.be.true;
    expect(response2.value.equals(value2)).to.be.true;
    expect(response2.version).to.equal('2.0');
    expect(response2.keyknoxHash).not.to.be.undefined;
  });

  it('KTC-3', async () => {
    const response = await client.pullValue(jwt.toString());
    expect(response.meta.byteLength).to.equal(0);
    expect(response.value.byteLength).to.equal(0);
    expect(response.version).to.equal('1.0');
  });

  it('KTC-4', async () => {
    const value1 = NodeBuffer.from('value1');
    const meta1 = NodeBuffer.from('meta1');
    const token = jwt.toString();
    await client.pushValue(meta1, value1, token);
    const response2 = await client.resetValue(token);
    expect(response2.meta.byteLength).to.equal(0);
    expect(response2.value.byteLength).to.equal(0);
    expect(response2.version).to.equal('2.0');
  });

  it('KTC-5', async () => {
    const response = await client.resetValue(jwt.toString());
    expect(response.meta.byteLength).to.equal(0);
    expect(response.value.byteLength).to.equal(0);
    expect(response.version).to.equal('1.0');
  });
});

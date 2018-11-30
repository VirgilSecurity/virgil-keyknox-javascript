/* eslint-disable */

const { createServer } = require('http');
const { parse } = require('querystring');
const { VirgilCrypto, VirgilAccessTokenSigner } = require('virgil-crypto');
const { JwtGenerator } = require('virgil-sdk');

const config = {
  APP_ID: 'YOUR_APP_ID',
  API_KEY: 'YOUR_API_KEY',
  API_KEY_ID: 'YOUR_API_KEY_ID',
  PORT: 3000,
};

const virgilCrypto = new VirgilCrypto();
const accessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
const apiKey = virgilCrypto.importPrivateKey(config.API_KEY);
const jwtGenerator = new JwtGenerator({
  apiKey,
  accessTokenSigner,
  appId: config.APP_ID,
  apiKeyId: config.API_KEY_ID,
});

const server = createServer((request, response) => {
  const params = parse(request.url.split('/?')[1]);
  const jwt = jwtGenerator.generateToken(params.identity);
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.write(JSON.stringify({ jwt: jwt.toString() }));
  response.end();
});

server.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

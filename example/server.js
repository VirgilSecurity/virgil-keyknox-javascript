const { createServer } = require('http');
const { parse } = require('querystring');
const dotenv = require('dotenv');
const { initCrypto, VirgilCrypto, VirgilAccessTokenSigner } = require('virgil-crypto');
const { JwtGenerator } = require('virgil-sdk');

dotenv.config();

initCrypto().then(() => {
  const virgilCrypto = new VirgilCrypto();
  const accessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
  const apiKey = virgilCrypto.importPrivateKey(process.env.API_KEY);
  const jwtGenerator = new JwtGenerator({
    apiKey,
    accessTokenSigner,
    appId: process.env.APP_ID,
    apiKeyId: process.env.API_KEY_ID,
  });

  const server = createServer((request, response) => {
    const params = parse(request.url.split('/?')[1]);
    const jwt = jwtGenerator.generateToken(params.identity);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify({ jwt: jwt.toString() }));
    response.end();
  });

  server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
});

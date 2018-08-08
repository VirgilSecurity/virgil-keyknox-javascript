const { get } = require('http');
const { stringify } = require('querystring');
const { VirgilCrypto } = require('virgil-crypto');
const { KeyEntryStorage, CachingJwtProvider } = require('virgil-sdk');

const { SyncKeyStorage } = require('../dist/keyknox.node.cjs');

const config = {
  endpoint: 'http://localhost:3000',
  identity: 'user@example.com',
};

function renewJwtFn() {
  return new Promise(resolve => {
    get(`${config.endpoint}/?${stringify({ identity: config.identity })}`, response => {
      let rawData = '';
      response.on('data', chunk => {
        rawData += chunk;
      });
      response.on('end', () => {
        const data = JSON.parse(rawData);
        resolve(data.jwt);
      });
    });
  });
}

const virgilCrypto = new VirgilCrypto();
const accessTokenProvider = new CachingJwtProvider(renewJwtFn);
const keyEntryStorage = new KeyEntryStorage();
const keyPair = virgilCrypto.generateKeys();
const syncKeyStorage = SyncKeyStorage.create({
  accessTokenProvider,
  keyEntryStorage,
  identity: config.identity,
  privateKey: keyPair.privateKey,
  publicKey: keyPair.publicKey,
});

syncKeyStorage
  .sync()
  .then(() => syncKeyStorage.retrieveAllEntries())
  .then(allEntries => {
    console.log('all entries:', allEntries);
    return syncKeyStorage.storeEntry('entry', Buffer.from('data'));
  })
  .then(storedEntry => {
    console.log('stored entry:', storedEntry);
    return syncKeyStorage.storeEntries([
      { name: 'entry1', data: Buffer.from('data1') },
      { name: 'entry2', data: Buffer.from('data2') },
      { name: 'entry3', data: Buffer.from('data3') },
    ]);
  })
  .then(storedEntries => {
    console.log('stored entries:', storedEntries);
    return syncKeyStorage.updateEntry('entry1', Buffer.from('data1Updated'));
  })
  .then(() => syncKeyStorage.retrieveEntry('entry1'))
  .then(entry1 => {
    console.log('entry1:', entry1);
    return syncKeyStorage.retrieveAllEntries();
  })
  .then(allEntries => {
    console.log('all entries:', allEntries);
    return syncKeyStorage.deleteEntry('entry1');
  })
  .then(() => syncKeyStorage.retrieveAllEntries())
  .then(allEntries => {
    console.log('all entries:', allEntries);
    return syncKeyStorage.deleteEntries(['entry2', 'entry3']);
  })
  .then(() => syncKeyStorage.retrieveAllEntries())
  .then(allEntries => {
    console.log('all entries:', allEntries);
    const newKeyPair = virgilCrypto.generateKeys();
    return syncKeyStorage.updateRecipients({
      newPrivateKey: newKeyPair.privateKey,
      newPublicKey: newKeyPair.publicKey,
    });
  })
  .then(() => syncKeyStorage.retrieveAllEntries())
  .then(allEntries => {
    console.log('all entries:', allEntries);
  });

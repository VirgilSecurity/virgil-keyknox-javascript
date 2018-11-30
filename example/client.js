/* eslint-disable */

const { get } = require('http');
const { stringify } = require('querystring');
const { VirgilCrypto } = require('virgil-crypto');
const { KeyEntryStorage, CachingJwtProvider } = require('virgil-sdk');
const uuid = require('uuid/v4');

const { SyncKeyStorage } = require('../dist/keyknox.node.cjs');

const config = {
  endpoint: 'http://localhost:3000',
  identity: uuid(),
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
  privateKey: keyPair.privateKey,
  publicKeys: keyPair.publicKey,
});

console.log('syncing...');
syncKeyStorage
  .sync()
  .then(() => {
    console.log('sync complete');
    console.log('retrieving all entries...');
    return syncKeyStorage.retrieveAllEntries();
  })
  .then(allEntries => {
    console.log('all entries:', allEntries);
    console.log('storing new entry...');
    return syncKeyStorage.storeEntry('entry', Buffer.from('data'));
  })
  .then(storedEntry => {
    console.log('stored entry:', storedEntry);
    console.log('storing new entries...');
    return syncKeyStorage.storeEntries([
      { name: 'entry1', data: Buffer.from('data1') },
      { name: 'entry2', data: Buffer.from('data2') },
      { name: 'entry3', data: Buffer.from('data3') },
    ]);
  })
  .then(storedEntries => {
    console.log('stored entries:', storedEntries);
    console.log('updating entry1...');
    return syncKeyStorage.updateEntry('entry1', Buffer.from('data1Updated'));
  })
  .then(() => {
    console.log('entry1 updated...');
    console.log('retrieving entry1...');
    return syncKeyStorage.retrieveEntry('entry1');
  })
  .then(entry1 => {
    console.log('entry1:', entry1);
    console.log('retrieving all entries...');
    return syncKeyStorage.retrieveAllEntries();
  })
  .then(allEntries => {
    console.log('all entries:', allEntries);
    console.log('deleting entry1...');
    return syncKeyStorage.deleteEntry('entry1');
  })
  .then(() => {
    console.log('entry1 deleted');
    console.log('retrieving all entries...');
    return syncKeyStorage.retrieveAllEntries();
  })
  .then(allEntries => {
    console.log('all entries:', allEntries);
    console.log('deleting entry2 and entry3...');
    return syncKeyStorage.deleteEntries(['entry2', 'entry3']);
  })
  .then(() => {
    console.log('entry2 and entry3 deleted');
    console.log('retrieving all entries...');
    return syncKeyStorage.retrieveAllEntries();
  })
  .then(allEntries => {
    console.log('all entries:', allEntries);
    console.log('updating recipients...');
    const newKeyPair = virgilCrypto.generateKeys();
    return syncKeyStorage.updateRecipients({
      newPrivateKey: newKeyPair.privateKey,
      newPublicKeys: newKeyPair.publicKey,
    });
  })
  .then(() => {
    console.log('recipients updated');
    console.log('retrieving all entries...');
    return syncKeyStorage.retrieveAllEntries();
  })
  .then(allEntries => {
    console.log('all entries:', allEntries);
  });

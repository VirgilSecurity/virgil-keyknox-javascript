import { expect } from 'chai';

import uuid from 'uuid/v4';
import {
  initCrypto,
  hasFoundationModules,
  VirgilCrypto,
  VirgilAccessTokenSigner,
  VirgilCardCrypto,
} from 'virgil-crypto';
import { JwtGenerator, GeneratorJwtProvider, VirgilCardVerifier, CardManager } from 'virgil-sdk';

import { CloudGroupTicketStorage } from '../CloudGroupTicketStorage';
import { GroupTicketAlreadyExistsError, GroupTicketDoesntExistError } from '../errors';
import { KeyknoxClient } from '../KeyknoxClient';
import { KeyknoxCrypto } from '../KeyknoxCrypto';
import { KeyknoxManager } from '../KeyknoxManager';
import { IPrivateKey, IPublicKey, ICard, IGroupSessionMessageInfo } from '../types';

describe('CloudGroupTicketStorage', () => {
  let jwtGenerator: JwtGenerator;
  let virgilCrypto: VirgilCrypto;

  let identity: string;
  let keyPair: {
    privateKey: IPrivateKey;
    publicKey: IPublicKey;
  };
  let keyknoxManager: KeyknoxManager;
  let cloudGroupSessionStorage: CloudGroupTicketStorage;

  let card: ICard;
  let cardKeyPair: {
    privateKey: IPrivateKey;
    publicKey: IPublicKey;
  };
  let cardKeyknoxManager: KeyknoxManager;
  let cardCloudGroupTicketStorage: CloudGroupTicketStorage;

  const generateCard = async () => {
    const cardIdentity = uuid();
    const cardCrypto = new VirgilCardCrypto(virgilCrypto);
    const cardVerifier = new VirgilCardVerifier(cardCrypto, { verifyVirgilSignature: false });
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, cardIdentity);
    const cardManager = new CardManager({
      accessTokenProvider,
      cardCrypto,
      cardVerifier,
      apiUrl: process.env.API_URL,
      retryOnUnauthorized: false,
    });
    const cardKeyPair = virgilCrypto.generateKeys();
    const card = await cardManager.publishCard({
      privateKey: cardKeyPair.privateKey,
      publicKey: cardKeyPair.publicKey,
      identity: cardIdentity,
    });
    return {
      card,
      keyPair: cardKeyPair,
    };
  };

  const generateGroupSessionMessageInfo = (amount?: number) => {
    const groupSession = virgilCrypto.generateGroupSession({
      value: 'group-session',
      encoding: 'utf8',
    });
    const myAmount = typeof amount === 'undefined' ? 1 : amount;
    if (myAmount <= 0) {
      throw new TypeError('`amount` should be greater than 0');
    }
    const sessionId = groupSession.getSessionId();
    const epochNumber = groupSession.getCurrentEpochNumber();
    const data = groupSession.export()[0];
    const results: IGroupSessionMessageInfo[] = [{ sessionId, epochNumber, data }];
    for (let i = 0; i < myAmount - 1; i += 1) {
      results.push(groupSession.addNewEpoch());
    }
    return results;
  };

  before(async () => {
    if (!hasFoundationModules()) {
      await initCrypto();
    }
  });

  beforeEach(async () => {
    virgilCrypto = new VirgilCrypto();
    const virgilAccessTokenSigner = new VirgilAccessTokenSigner(virgilCrypto);
    const apiKey = virgilCrypto.importPrivateKey({
      value: process.env.API_KEY!,
      encoding: 'base64',
    });
    jwtGenerator = new JwtGenerator({
      apiKey,
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: virgilAccessTokenSigner,
    });

    identity = uuid();
    keyPair = virgilCrypto.generateKeys();
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, identity);
    keyknoxManager = new KeyknoxManager(
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(accessTokenProvider, process.env.API_URL),
    );
    cloudGroupSessionStorage = new CloudGroupTicketStorage({
      keyknoxManager,
      identity,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    });

    const { card: myCard, keyPair: myCardKeyPair } = await generateCard();
    card = myCard;
    cardKeyPair = myCardKeyPair;
    const cardAccessTokenProvider = new GeneratorJwtProvider(
      jwtGenerator,
      undefined,
      card.identity,
    );
    cardKeyknoxManager = new KeyknoxManager(
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(cardAccessTokenProvider, process.env.API_URL),
    );
    cardCloudGroupTicketStorage = new CloudGroupTicketStorage({
      keyknoxManager: cardKeyknoxManager,
      identity: card.identity,
      privateKey: cardKeyPair.privateKey,
      publicKey: cardKeyPair.publicKey,
    });
  });

  describe('store', () => {
    it('stores message info', async () => {
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupSessionStorage.store(groupSessionMessageInfo);
      const decryptedKeyknoxValue = await keyknoxManager.v2Pull({
        identity,
        root: CloudGroupTicketStorage.DEFAULT_ROOT,
        path: groupSessionMessageInfo.sessionId,
        key: groupSessionMessageInfo.epochNumber.toString(),
        privateKey: keyPair.privateKey,
        publicKeys: keyPair.publicKey,
      });
      expect(decryptedKeyknoxValue.value).to.equal(groupSessionMessageInfo.data);
    });

    it('stores message info for card', async () => {
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupSessionStorage.store(groupSessionMessageInfo, card);
      const [ticket] = await cardCloudGroupTicketStorage.retrieve(
        groupSessionMessageInfo.sessionId,
        identity,
        keyPair.publicKey,
      );
      expect(ticket.groupSessionMessageInfo.epochNumber).to.equal(
        groupSessionMessageInfo.epochNumber,
      );
      expect(ticket.groupSessionMessageInfo.sessionId).to.equal(groupSessionMessageInfo.sessionId);
      expect(ticket.groupSessionMessageInfo.data).to.equal(groupSessionMessageInfo.data);
    });

    it('throws if message info already exists', async () => {
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupSessionStorage.store(groupSessionMessageInfo);
      try {
        await cloudGroupSessionStorage.store(groupSessionMessageInfo);
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketAlreadyExistsError);
      }
    });
  });

  describe('retrieve', () => {
    it('retrieves group session', async () => {
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupSessionStorage.store(groupSessionMessageInfo1);
      await cloudGroupSessionStorage.store(groupSessionMessageInfo2);
      const [ticket1, ticket2] = await cloudGroupSessionStorage.retrieve(
        groupSessionMessageInfo1.sessionId,
      );
      let myGroupSessionMessageInfo1 = ticket1.groupSessionMessageInfo;
      let myGroupSessionMessageInfo2 = ticket2.groupSessionMessageInfo;
      if (ticket2.groupSessionMessageInfo.epochNumber === groupSessionMessageInfo1.epochNumber) {
        myGroupSessionMessageInfo1 = ticket2.groupSessionMessageInfo;
        myGroupSessionMessageInfo2 = ticket1.groupSessionMessageInfo;
      }
      expect(myGroupSessionMessageInfo1.sessionId).to.equal(groupSessionMessageInfo1.sessionId);
      expect(myGroupSessionMessageInfo1.epochNumber).to.equal(groupSessionMessageInfo1.epochNumber);
      expect(myGroupSessionMessageInfo1.data).to.equal(groupSessionMessageInfo1.data);
      expect(myGroupSessionMessageInfo2.sessionId).to.equal(groupSessionMessageInfo2.sessionId);
      expect(myGroupSessionMessageInfo2.epochNumber).to.equal(groupSessionMessageInfo2.epochNumber);
      expect(myGroupSessionMessageInfo2.data).to.equal(groupSessionMessageInfo2.data);
    });

    it('retrieves group session for identity', async () => {
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupSessionStorage.store(groupSessionMessageInfo, card);
      const [ticket] = await cardCloudGroupTicketStorage.retrieve(
        groupSessionMessageInfo.sessionId,
        identity,
        keyPair.publicKey,
      );
      expect(ticket.groupSessionMessageInfo.sessionId).to.equal(groupSessionMessageInfo.sessionId);
      expect(ticket.groupSessionMessageInfo.epochNumber).to.equal(
        groupSessionMessageInfo.epochNumber,
      );
      expect(ticket.groupSessionMessageInfo.data).to.equal(groupSessionMessageInfo.data);
    });

    it('throws if we try to retrieve non-existent group session', async () => {
      try {
        await cloudGroupSessionStorage.retrieve(uuid());
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketDoesntExistError);
      }
    });
  });

  describe('addRecipients', () => {
    it('adds recipients to all existing message infos', async () => {
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupSessionStorage.store(groupSessionMessageInfo1);
      await cloudGroupSessionStorage.store(groupSessionMessageInfo2);
      await cloudGroupSessionStorage.addRecipients(groupSessionMessageInfo1.sessionId, [card]);
      const tickets = await cardCloudGroupTicketStorage.retrieve(
        groupSessionMessageInfo1.sessionId,
        identity,
        keyPair.publicKey,
      );
      expect(tickets).to.have.length(2);
    });
  });

  describe('reAddRecipient', () => {
    it('re-adds recipient to all existing message infos', async () => {
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupSessionStorage.store(groupSessionMessageInfo1);
      await cloudGroupSessionStorage.store(groupSessionMessageInfo2);
      await cloudGroupSessionStorage.addRecipient(groupSessionMessageInfo1.sessionId, card);
      await cloudGroupSessionStorage.reAddRecipient(groupSessionMessageInfo1.sessionId, card);
      const tickets = await cardCloudGroupTicketStorage.retrieve(
        groupSessionMessageInfo1.sessionId,
        identity,
        keyPair.publicKey,
      );
      expect(tickets).to.have.length(2);
    });
  });

  describe('removeRecipient', async () => {
    it('removes recipient from all existing message infos', async () => {
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupSessionStorage.store(groupSessionMessageInfo1);
      await cloudGroupSessionStorage.store(groupSessionMessageInfo2);
      await cloudGroupSessionStorage.addRecipient(groupSessionMessageInfo1.sessionId, card);
      await cloudGroupSessionStorage.removeRecipient(
        groupSessionMessageInfo1.sessionId,
        card.identity,
      );
      try {
        await cardCloudGroupTicketStorage.retrieve(
          groupSessionMessageInfo1.sessionId,
          identity,
          keyPair.publicKey,
        );
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketDoesntExistError);
      }
    });

    it('removes recipient in message info based on `epochNumber`', async () => {
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupSessionStorage.store(groupSessionMessageInfo1);
      await cloudGroupSessionStorage.store(groupSessionMessageInfo2);
      await cloudGroupSessionStorage.addRecipient(groupSessionMessageInfo1.sessionId, card);
      await cloudGroupSessionStorage.removeRecipient(
        groupSessionMessageInfo1.sessionId,
        card.identity,
        groupSessionMessageInfo2.epochNumber,
      );
      const [ticket] = await cardCloudGroupTicketStorage.retrieve(
        groupSessionMessageInfo1.sessionId,
        identity,
        keyPair.publicKey,
      );
      expect(ticket.groupSessionMessageInfo.epochNumber).to.equal(
        groupSessionMessageInfo1.epochNumber,
      );
    });
  });

  describe('delete', () => {
    it('deletes group session', async () => {
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupSessionStorage.store(groupSessionMessageInfo);
      await cloudGroupSessionStorage.delete(groupSessionMessageInfo.sessionId);
      try {
        await cloudGroupSessionStorage.retrieve(groupSessionMessageInfo.sessionId);
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketDoesntExistError);
      }
    });
  });
});

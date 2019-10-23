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
import {
  GroupTicketAlreadyExistsError,
  GroupTicketDoesntExistError,
  GroupTicketNoAccessError,
} from '../errors';
import { KeyknoxClient } from '../KeyknoxClient';
import { KeyknoxCrypto } from '../KeyknoxCrypto';
import { KeyknoxManager } from '../KeyknoxManager';
import { ICard, IKeyPair, IGroupSessionMessageInfo } from '../types';

describe('CloudGroupTicketStorage', () => {
  let jwtGenerator: JwtGenerator;
  let virgilCrypto: VirgilCrypto;

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
    const keyPair = virgilCrypto.generateKeys();
    const card = await cardManager.publishCard({
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      identity: cardIdentity,
    });
    return {
      card,
      keyPair,
    };
  };

  const rotatePrivateKey = async (previousCard: ICard) => {
    const cardCrypto = new VirgilCardCrypto(virgilCrypto);
    const cardVerifier = new VirgilCardVerifier(cardCrypto, { verifyVirgilSignature: false });
    const accessTokenProvider = new GeneratorJwtProvider(
      jwtGenerator,
      undefined,
      previousCard.identity,
    );
    const cardManager = new CardManager({
      accessTokenProvider,
      cardCrypto,
      cardVerifier,
      apiUrl: process.env.API_URL,
      retryOnUnauthorized: false,
    });
    const keyPair = virgilCrypto.generateKeys();
    const card = await cardManager.publishCard({
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      previousCardId: previousCard.id,
    });
    return {
      card,
      keyPair,
    };
  };

  const createCloudGroupTicketStorage = async (card: ICard, keyPair: IKeyPair) => {
    const accessTokenProvider = new GeneratorJwtProvider(jwtGenerator, undefined, card.identity);
    const keyknoxManager = new KeyknoxManager(
      new KeyknoxCrypto(virgilCrypto),
      new KeyknoxClient(accessTokenProvider, process.env.API_URL),
    );
    const cloudGroupTicketStorage = new CloudGroupTicketStorage({
      keyknoxManager,
      identity: card.identity,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    });
    return {
      accessTokenProvider,
      keyknoxManager,
      cloudGroupTicketStorage,
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
    const results: IGroupSessionMessageInfo[] = [
      { sessionId, epochNumber, data: data.toString('base64') },
    ];
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
    jwtGenerator = new JwtGenerator({
      apiKey: virgilCrypto.importPrivateKey({
        value: process.env.API_KEY!,
        encoding: 'base64',
      }),
      appId: process.env.APP_ID!,
      apiKeyId: process.env.API_KEY_ID!,
      accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto),
    });
  });

  describe('store', () => {
    it('stores message info', async () => {
      const { card, keyPair } = await generateCard();
      const { keyknoxManager, cloudGroupTicketStorage } = await createCloudGroupTicketStorage(
        card,
        keyPair,
      );
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage.store(groupSessionMessageInfo);
      const decryptedKeyknoxValue = await keyknoxManager.v2Pull({
        root: CloudGroupTicketStorage.DEFAULT_ROOT,
        path: groupSessionMessageInfo.sessionId,
        key: groupSessionMessageInfo.epochNumber.toString(),
        identity: card.identity,
        privateKey: keyPair.privateKey,
        publicKeys: keyPair.publicKey,
      });
      expect(decryptedKeyknoxValue.value).to.equal(groupSessionMessageInfo.data);
    });

    it('stores message info for card', async () => {
      const { card, keyPair } = await generateCard();
      const { cloudGroupTicketStorage } = await createCloudGroupTicketStorage(card, keyPair);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage.store(groupSessionMessageInfo, card);
      const [ticket] = await cloudGroupTicketStorage.retrieve(
        groupSessionMessageInfo.sessionId,
        card.identity,
        keyPair.publicKey,
      );
      expect(ticket.groupSessionMessageInfo.epochNumber).to.equal(
        groupSessionMessageInfo.epochNumber,
      );
      expect(ticket.groupSessionMessageInfo.sessionId).to.equal(groupSessionMessageInfo.sessionId);
      expect(ticket.groupSessionMessageInfo.data).to.equal(groupSessionMessageInfo.data);
    });

    it('throws if message info already exists', async () => {
      const { card, keyPair } = await generateCard();
      const { cloudGroupTicketStorage } = await createCloudGroupTicketStorage(card, keyPair);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage.store(groupSessionMessageInfo);
      try {
        await cloudGroupTicketStorage.store(groupSessionMessageInfo);
        expect.fail();
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
      const { card, keyPair } = await generateCard();
      const { cloudGroupTicketStorage } = await createCloudGroupTicketStorage(card, keyPair);
      await cloudGroupTicketStorage.store(groupSessionMessageInfo1);
      await cloudGroupTicketStorage.store(groupSessionMessageInfo2);
      const [ticket1, ticket2] = await cloudGroupTicketStorage.retrieve(
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
      const { card: card1, keyPair: keyPair1 } = await generateCard();
      const { card: card2, keyPair: keyPair2 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card1, keyPair1);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(card2, keyPair2);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo, card2);
      const [ticket] = await cloudGroupTicketStorage2.retrieve(
        groupSessionMessageInfo.sessionId,
        card1.identity,
        card1.publicKey,
      );
      expect(ticket.groupSessionMessageInfo.sessionId).to.equal(groupSessionMessageInfo.sessionId);
      expect(ticket.groupSessionMessageInfo.epochNumber).to.equal(
        groupSessionMessageInfo.epochNumber,
      );
      expect(ticket.groupSessionMessageInfo.data).to.equal(groupSessionMessageInfo.data);
    });

    it('throws if we try to retrieve non-existent group session', async () => {
      const { card, keyPair } = await generateCard();
      const { cloudGroupTicketStorage } = await createCloudGroupTicketStorage(card, keyPair);
      try {
        await cloudGroupTicketStorage.retrieve(uuid());
        expect.fail();
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketDoesntExistError);
      }
    });

    it('throws if recipient has no access to the group ticket', async () => {
      const { card: card1, keyPair: keyPair1 } = await generateCard();
      const { card: card2 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card1, keyPair1);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo, card2);
      const { card: card2Updated, keyPair: keyPair2Updated } = await rotatePrivateKey(card2);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(card2Updated, keyPair2Updated);
      try {
        await cloudGroupTicketStorage2.retrieve(
          groupSessionMessageInfo.sessionId,
          card1.identity,
          card1.publicKey,
        );
        expect.fail();
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketNoAccessError);
      }
    });
  });

  describe('addRecipients', () => {
    it('adds recipients to all existing message infos', async () => {
      const { card: card1, keyPair: keyPair1 } = await generateCard();
      const { card: card2, keyPair: keyPair2 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card1, keyPair1);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(card2, keyPair2);
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo1);
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo2);
      await cloudGroupTicketStorage1.addRecipients(groupSessionMessageInfo1.sessionId, [card2]);
      const tickets = await cloudGroupTicketStorage2.retrieve(
        groupSessionMessageInfo1.sessionId,
        card1.identity,
        card1.publicKey,
      );
      expect(tickets).to.have.length(2);
    });

    it('throws if recipient has no access to the group ticket', async () => {
      const { card: card, keyPair: keyPair } = await generateCard();
      const { card: card1 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card, keyPair);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo);
      const { card: cardUpdated, keyPair: keyPairUpdated } = await rotatePrivateKey(card);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(cardUpdated, keyPairUpdated);
      try {
        await cloudGroupTicketStorage2.addRecipient(groupSessionMessageInfo.sessionId, card1);
        expect.fail();
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketNoAccessError);
      }
    });
  });

  describe('reAddRecipient', () => {
    it('re-adds recipient to all existing message infos', async () => {
      const { card: card1, keyPair: keyPair1 } = await generateCard();
      const { card: card2, keyPair: keyPair2 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card1, keyPair1);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(card2, keyPair2);
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo1);
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo2);
      await cloudGroupTicketStorage1.addRecipient(groupSessionMessageInfo1.sessionId, card2);
      await cloudGroupTicketStorage1.reAddRecipient(groupSessionMessageInfo1.sessionId, card2);
      const tickets = await cloudGroupTicketStorage2.retrieve(
        groupSessionMessageInfo1.sessionId,
        card1.identity,
        card1.publicKey,
      );
      expect(tickets).to.have.length(2);
    });

    it('throws if recipient has no access to the group ticket', async () => {
      const { card: card, keyPair: keyPair } = await generateCard();
      const { card: card1 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card, keyPair);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo);
      await cloudGroupTicketStorage1.addRecipient(groupSessionMessageInfo.sessionId, card1);
      const { card: cardUpdated, keyPair: keyPairUpdated } = await rotatePrivateKey(card);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(cardUpdated, keyPairUpdated);
      try {
        await cloudGroupTicketStorage2.reAddRecipient(groupSessionMessageInfo.sessionId, card1);
        expect.fail();
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketNoAccessError);
      }
    });
  });

  describe('removeRecipient', async () => {
    it('removes recipient from all existing message infos', async () => {
      const { card: card1, keyPair: keyPair1 } = await generateCard();
      const { card: card2, keyPair: keyPair2 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card1, keyPair1);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(card2, keyPair2);
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo1);
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo2);
      await cloudGroupTicketStorage1.addRecipient(groupSessionMessageInfo1.sessionId, card2);
      await cloudGroupTicketStorage1.removeRecipient(
        groupSessionMessageInfo1.sessionId,
        card2.identity,
      );
      try {
        await cloudGroupTicketStorage2.retrieve(
          groupSessionMessageInfo1.sessionId,
          card1.identity,
          card1.publicKey,
        );
        expect.fail();
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketDoesntExistError);
      }
    });

    it('removes recipient in message info based on `epochNumber`', async () => {
      const { card: card1, keyPair: keyPair1 } = await generateCard();
      const { card: card2, keyPair: keyPair2 } = await generateCard();
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage1,
      } = await createCloudGroupTicketStorage(card1, keyPair1);
      const {
        cloudGroupTicketStorage: cloudGroupTicketStorage2,
      } = await createCloudGroupTicketStorage(card2, keyPair2);
      const [groupSessionMessageInfo1, groupSessionMessageInfo2] = generateGroupSessionMessageInfo(
        2,
      );
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo1);
      await cloudGroupTicketStorage1.store(groupSessionMessageInfo2);
      await cloudGroupTicketStorage1.addRecipient(groupSessionMessageInfo1.sessionId, card2);
      await cloudGroupTicketStorage1.removeRecipient(
        groupSessionMessageInfo1.sessionId,
        card2.identity,
        groupSessionMessageInfo2.epochNumber,
      );
      const [ticket] = await cloudGroupTicketStorage2.retrieve(
        groupSessionMessageInfo1.sessionId,
        card1.identity,
        card1.publicKey,
      );
      expect(ticket.groupSessionMessageInfo.epochNumber).to.equal(
        groupSessionMessageInfo1.epochNumber,
      );
    });
  });

  describe('delete', () => {
    it('deletes group session', async () => {
      const { card, keyPair } = await generateCard();
      const { cloudGroupTicketStorage } = await createCloudGroupTicketStorage(card, keyPair);
      const [groupSessionMessageInfo] = generateGroupSessionMessageInfo();
      await cloudGroupTicketStorage.store(groupSessionMessageInfo);
      await cloudGroupTicketStorage.delete(groupSessionMessageInfo.sessionId);
      try {
        await cloudGroupTicketStorage.retrieve(groupSessionMessageInfo.sessionId);
        expect.fail();
      } catch (error) {
        expect(error).to.be.instanceOf(GroupTicketDoesntExistError);
      }
    });
  });
});

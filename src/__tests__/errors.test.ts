import { expect } from 'chai';

import {
  KeyknoxError,
  KeyknoxClientError,
  CloudKeyStorageOutOfSyncError,
  CloudEntryExistsError,
  CloudEntryDoesntExistError,
  KeyEntryExistsError,
  KeyEntryDoesntExistError,
} from '../errors';

describe('errors', () => {
  describe('KeyknoxError', () => {
    it('contains fields', () => {
      const message = 'message';
      const error = new KeyknoxError(message);
      expect(error.message).to.equal(message);
    });

    it('adjusts the prototype', () => {
      const error = new KeyknoxError('message');
      expect(error).to.be.instanceOf(KeyknoxError);
    });
  });

  describe('KeyknoxClientError', () => {
    it('contains fields', () => {
      const message = 'message';
      const status = 123;
      const code = 123;
      const error = new KeyknoxClientError(message, status, code);
      expect(error.message).to.equal(message);
      expect(error.status).to.equal(status);
      expect(error.code).to.equal(code);
    });

    it('extends KeyknoxError', () => {
      const error = new KeyknoxClientError('message');
      expect(error).to.be.instanceOf(KeyknoxError);
    });

    it('adjusts the prototype', () => {
      const error = new KeyknoxClientError('message');
      expect(error).to.be.instanceOf(KeyknoxClientError);
    });
  });

  describe('CloudKeyStorageOutOfSyncError', () => {
    it('contains fields', () => {
      const message = 'message';
      const error = new KeyknoxError(message);
      expect(error.message).to.equal(message);
    });

    it('extends KeyknoxError', () => {
      const error = new CloudKeyStorageOutOfSyncError();
      expect(error).to.be.instanceOf(KeyknoxError);
    });

    it('adjusts the prototype', () => {
      const error = new CloudKeyStorageOutOfSyncError();
      expect(error).to.be.instanceOf(CloudKeyStorageOutOfSyncError);
    });
  });

  describe('CloudEntryExistsError', () => {
    it('contains fields', () => {
      const cloudEntryName = 'cloudEntryName';
      const error = new CloudEntryExistsError(cloudEntryName);
      expect(error.cloudEntryName).to.equal(cloudEntryName);
      expect(typeof error.message === 'string').to.be.true;
    });

    it('extends KeyknoxError', () => {
      const error = new CloudEntryExistsError('cloudEntry');
      expect(error).to.be.instanceOf(KeyknoxError);
    });

    it('adjusts the prototype', () => {
      const error = new CloudEntryExistsError('cloudEntry');
      expect(error).to.be.instanceOf(CloudEntryExistsError);
    });
  });

  describe('CloudEntryDoesntExistError', () => {
    it('contains fields', () => {
      const cloudEntryName = 'cloudEntryName';
      const error = new CloudEntryDoesntExistError(cloudEntryName);
      expect(error.cloudEntryName).to.equal(cloudEntryName);
      expect(typeof error.message === 'string').to.be.true;
    });

    it('extends KeyknoxError', () => {
      const error = new CloudEntryDoesntExistError('cloudEntry');
      expect(error).to.be.instanceOf(KeyknoxError);
    });

    it('adjusts the prototype', () => {
      const error = new CloudEntryDoesntExistError('cloudEntry');
      expect(error).to.be.instanceOf(CloudEntryDoesntExistError);
    });
  });

  describe('KeyEntryExistsError', () => {
    it('contains fields', () => {
      const keyEntryName = 'keyEntryName';
      const error = new KeyEntryExistsError(keyEntryName);
      expect(error.keyEntryName).to.equal(keyEntryName);
      expect(typeof error.message === 'string').to.be.true;
    });

    it('extends KeyknoxError', () => {
      const error = new KeyEntryExistsError('keyEntry');
      expect(error).to.be.instanceOf(KeyknoxError);
    });

    it('adjusts the prototype', () => {
      const error = new KeyEntryExistsError('keyEntry');
      expect(error).to.be.instanceOf(KeyEntryExistsError);
    });
  });

  describe('KeyEntryDoesntExistError', () => {
    it('contains fields', () => {
      const keyEntryName = 'keyEntryName';
      const error = new KeyEntryDoesntExistError(keyEntryName);
      expect(error.keyEntryName).to.equal(keyEntryName);
      expect(typeof error.message === 'string').to.be.true;
    });

    it('extends KeyknoxError', () => {
      const error = new KeyEntryDoesntExistError('keyEntry');
      expect(error).to.be.instanceOf(KeyknoxError);
    });

    it('adjusts the prototype', () => {
      const error = new KeyEntryDoesntExistError('keyEntry');
      expect(error).to.be.instanceOf(KeyEntryDoesntExistError);
    });
  });
});

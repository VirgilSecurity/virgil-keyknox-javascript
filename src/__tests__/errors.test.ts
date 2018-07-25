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
    it('should contain fields', () => {
      const message = 'message';
      const error = new KeyknoxError(message);
      expect(error.message).toBe(message);
    });

    it('should adjust the prototype', () => {
      const error = new KeyknoxError('message');
      expect(error).toBeInstanceOf(KeyknoxError);
    });
  });

  describe('KeyknoxClientError', () => {
    it('should contain fields', () => {
      const message = 'message';
      const status = 123;
      const code = 123;
      const error = new KeyknoxClientError(message, status, code);
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(error.code).toBe(code);
    });

    it('should extend KeyknoxError', () => {
      const error = new KeyknoxClientError('message');
      expect(error).toBeInstanceOf(KeyknoxError);
    });

    it('should adjust the prototype', () => {
      const error = new KeyknoxClientError('message');
      expect(error).toBeInstanceOf(KeyknoxClientError);
    });
  });

  describe('CloudKeyStorageOutOfSyncError', () => {
    it('should contain fields', () => {
      const message = 'message';
      const error = new KeyknoxError(message);
      expect(error.message).toBe(message);
    });

    it('should extend KeyknoxError', () => {
      const error = new CloudKeyStorageOutOfSyncError();
      expect(error).toBeInstanceOf(KeyknoxError);
    });

    it('should adjust the prototype', () => {
      const error = new CloudKeyStorageOutOfSyncError();
      expect(error).toBeInstanceOf(CloudKeyStorageOutOfSyncError);
    });
  });

  describe('CloudEntryExistsError', () => {
    it('should contain fields', () => {
      const cloudEntryName = 'cloudEntryName';
      const error = new CloudEntryExistsError(cloudEntryName);
      expect(error.cloudEntryName).toBe(cloudEntryName);
      expect(typeof error.message === 'string').toBeTruthy();
    });

    it('should extend KeyknoxError', () => {
      const error = new CloudEntryExistsError('cloudEntry');
      expect(error).toBeInstanceOf(KeyknoxError);
    });

    it('should adjust the prototype', () => {
      const error = new CloudEntryExistsError('cloudEntry');
      expect(error).toBeInstanceOf(CloudEntryExistsError);
    });
  });

  describe('CloudEntryDoesntExistError', () => {
    it('should contain fields', () => {
      const cloudEntryName = 'cloudEntryName';
      const error = new CloudEntryDoesntExistError(cloudEntryName);
      expect(error.cloudEntryName).toBe(cloudEntryName);
      expect(typeof error.message === 'string').toBeTruthy();
    });

    it('should extend KeyknoxError', () => {
      const error = new CloudEntryDoesntExistError('cloudEntry');
      expect(error).toBeInstanceOf(KeyknoxError);
    });

    it('should adjust the prototype', () => {
      const error = new CloudEntryDoesntExistError('cloudEntry');
      expect(error).toBeInstanceOf(CloudEntryDoesntExistError);
    });
  });

  describe('KeyEntryExistsError', () => {
    it('should contain fields', () => {
      const keyEntryName = 'keyEntryName';
      const error = new KeyEntryExistsError(keyEntryName);
      expect(error.keyEntryName).toBe(keyEntryName);
      expect(typeof error.message === 'string').toBeTruthy();
    });

    it('should extend KeyknoxError', () => {
      const error = new KeyEntryExistsError('keyEntry');
      expect(error).toBeInstanceOf(KeyknoxError);
    });

    it('should adjust the prototype', () => {
      const error = new KeyEntryExistsError('keyEntry');
      expect(error).toBeInstanceOf(KeyEntryExistsError);
    });
  });

  describe('KeyEntryDoesntExistError', () => {
    it('should contain fields', () => {
      const keyEntryName = 'keyEntryName';
      const error = new KeyEntryDoesntExistError(keyEntryName);
      expect(error.keyEntryName).toBe(keyEntryName);
      expect(typeof error.message === 'string').toBeTruthy();
    });

    it('should extend KeyknoxError', () => {
      const error = new KeyEntryDoesntExistError('keyEntry');
      expect(error).toBeInstanceOf(KeyknoxError);
    });

    it('should adjust the prototype', () => {
      const error = new KeyEntryDoesntExistError('keyEntry');
      expect(error).toBeInstanceOf(KeyEntryDoesntExistError);
    });
  });
});

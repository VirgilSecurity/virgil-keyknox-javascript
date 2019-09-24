import { expect } from 'chai';

import { join } from 'path';
import uuid from 'uuid/v4';
import { KeyEntryStorage } from 'virgil-sdk';

import { KeyEntryStorageWrapper } from '../KeyEntryStorageWrapper';

describe('KeyEntryStorageWrapper', () => {
  let keyEntryStorage: KeyEntryStorage;
  let keyEntryStorageWrapper: KeyEntryStorageWrapper;

  beforeEach(() => {
    const identity = uuid();
    keyEntryStorage = new KeyEntryStorage(join(process.env.KEY_ENTRIES_FOLDER!, identity));
    keyEntryStorageWrapper = new KeyEntryStorageWrapper(identity, keyEntryStorage);
  });

  describe('save', () => {
    it('stores entry in `KeyEntryStorage`', async () => {
      await keyEntryStorageWrapper.save({ name: 'name', value: 'dmFsdWU=' });
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).to.have.length(1);
    });

    it('stores correct values in `KeyEntryStorage`', async () => {
      const keyEntry = await keyEntryStorageWrapper.save({
        name: 'name',
        value: 'dmFsdWU=',
        meta: {
          key: 'value',
        },
      });
      const [storedKeyEntry] = await keyEntryStorage.list();
      expect(storedKeyEntry.value).to.equal(keyEntry.value);
      expect(storedKeyEntry.meta).to.eql(keyEntry.meta);
      expect(storedKeyEntry.creationDate).to.eql(keyEntry.creationDate);
      expect(storedKeyEntry.modificationDate).to.eql(keyEntry.modificationDate);
    });

    it('stores entries in separate namespace', async () => {
      const params1 = {
        name: 'name',
        value: 'dmFsdWUx',
      };
      const params2 = {
        name: params1.name,
        value: 'dmFsdWUy',
      };
      await keyEntryStorage.save(params1);
      await keyEntryStorageWrapper.save(params2);
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).to.have.length(2);
    });
  });

  describe('load', () => {
    it('returns an `IKeyEntry` object if entry exists', async () => {
      const params = {
        name: 'name',
        value: 'dmFsdWU=',
      };
      await keyEntryStorageWrapper.save(params);
      const keyEntry = await keyEntryStorageWrapper.load(params.name);
      expect(keyEntry).not.to.be.undefined;
    });

    it('returns an `IKeyEntry` object with correct values', async () => {
      const params = {
        name: 'name',
        value: 'dmFsdWU=',
        meta: {
          key: 'value',
        },
      };
      await keyEntryStorageWrapper.save(params);
      const keyEntry = await keyEntryStorageWrapper.load(params.name);
      expect(keyEntry!.name).to.equal(params.name);
      expect(keyEntry!.value).to.equal(params.value);
      expect(keyEntry!.meta).to.eql(params.meta);
    });

    it('returns `null` if entry does not exist', async () => {
      const keyEntry = await keyEntryStorageWrapper.load('name');
      expect(keyEntry).to.be.null;
    });
  });

  describe('exists', () => {
    it('returns `true` if entry exists', async () => {
      const params = {
        name: 'name',
        value: 'dmFsdWU=',
      };
      await keyEntryStorageWrapper.save(params);
      const result = await keyEntryStorageWrapper.exists(params.name);
      expect(result).to.be.true;
    });

    it('returns `false` if entry does not exist', async () => {
      const result = await keyEntryStorageWrapper.exists('name');
      expect(result).to.be.false;
    });
  });

  describe('remove', () => {
    it('should not remove entries created outside of `KeyEntryStorageWrapper`', async () => {
      const params1 = {
        name: 'name',
        value: 'dmFsdWUx',
      };
      const params2 = {
        name: params1.name,
        value: 'dmFsdWUy',
      };
      await keyEntryStorage.save(params1);
      await keyEntryStorageWrapper.save(params2);
      await keyEntryStorage.remove(params2.name);
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).to.have.length(1);
    });
  });

  describe('list', () => {
    it('returns entries except ones created outside of `KeyEntryStorageWrapper`', async () => {
      await keyEntryStorage.save({ name: 'name', value: 'dmFsdWU=' });
      await keyEntryStorageWrapper.save({ name: 'name1', value: 'dmFsdWUx' });
      await keyEntryStorageWrapper.save({ name: 'name2', value: 'dmFsdWUy' });
      const keyEntries = await keyEntryStorageWrapper.list();
      expect(keyEntries).to.have.length(2);
    });
  });

  describe('update', () => {
    it('updates existing entry', async () => {
      const params1 = {
        name: 'name',
        value: 'dmFsdWUx',
      };
      const params2 = {
        name: params1.name,
        value: 'dmFsdWUy',
        meta: {
          key: 'value',
        },
      };
      await keyEntryStorageWrapper.save(params1);
      const keyEntry = await keyEntryStorageWrapper.update(params2);
      expect(keyEntry.name).to.equal(params1.name);
      expect(keyEntry.value).to.equal(params2.value);
      expect(keyEntry.meta).to.eql(params2.meta);
    });
  });

  describe('clear', () => {
    it('deletes entries except ones created outside of `KeyEntryStorageWrapper`', async () => {
      await keyEntryStorage.save({ name: 'name', value: 'dmFsdWU=' });
      await keyEntryStorageWrapper.save({ name: 'name1', value: 'dmFsdWUx' });
      await keyEntryStorageWrapper.save({ name: 'name2', value: 'dmFsdWUy' });
      await keyEntryStorageWrapper.clear();
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).to.have.length(1);
    });
  });
});

import { join } from 'path';
import { IKeyEntry, ISaveKeyEntryParams, IUpdateKeyEntryParams, KeyEntryStorage } from 'virgil-sdk';
import * as uuid from 'uuid/v4';

import KeyEntryStorageWrapper from '../KeyEntryStorageWrapper';

describe('KeyEntrySotrageWrapper', () => {
  let keyEntryStorage: KeyEntryStorage;
  let keyEntryStorageWrapper: KeyEntryStorageWrapper;

  beforeEach(() => {
    const identity = uuid();
    keyEntryStorage = new KeyEntryStorage(join(process.env.KEY_ENTRIES_FOLDER!, identity));
    keyEntryStorageWrapper = new KeyEntryStorageWrapper(identity, keyEntryStorage);
  });

  describe('save', () => {
    it("should store entry in 'KeyEntryStorage'", async () => {
      expect.assertions(1);
      await keyEntryStorageWrapper.save({ name: 'name', value: Buffer.from('value') });
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).toHaveLength(1);
    });

    it("should store correct values in 'KeyEntryStorage'", async () => {
      expect.assertions(4);
      const keyEntry = await keyEntryStorageWrapper.save({
        name: 'name',
        value: Buffer.from('value'),
        meta: {
          key: 'value',
        },
      });
      const [storedKeyEntry] = await keyEntryStorage.list();
      expect(storedKeyEntry.value).toEqual(keyEntry.value);
      expect(storedKeyEntry.meta).toEqual(keyEntry.meta);
      expect(storedKeyEntry.creationDate).toEqual(keyEntry.creationDate);
      expect(storedKeyEntry.modificationDate).toEqual(keyEntry.modificationDate);
    });

    it('should store entries in separate namespace', async () => {
      expect.assertions(1);
      const params1 = {
        name: 'name',
        value: Buffer.from('value1'),
      };
      const params2 = {
        name: params1.name,
        value: Buffer.from('value2'),
      };
      await keyEntryStorage.save(params1);
      await keyEntryStorageWrapper.save(params2);
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).toHaveLength(2);
    });
  });

  describe('load', () => {
    it("should return an 'IKeyEntry' object if entry exists", async () => {
      expect.assertions(1);
      const params = {
        name: 'name',
        value: Buffer.from('value'),
      };
      await keyEntryStorageWrapper.save(params);
      const keyEntry = await keyEntryStorageWrapper.load(params.name);
      expect(keyEntry).toBeDefined();
    });

    it("should return an 'IKeyEntry' object with correct values", async () => {
      expect.assertions(3);
      const params = {
        name: 'name',
        value: Buffer.from('value'),
        meta: {
          key: 'value',
        },
      };
      await keyEntryStorageWrapper.save(params);
      const keyEntry = await keyEntryStorageWrapper.load(params.name);
      expect(keyEntry!.name).toBe(params.name);
      expect(keyEntry!.value).toEqual(params.value);
      expect(keyEntry!.meta).toEqual(params.meta);
    });

    it("should return 'null' if entry does not exist", async () => {
      expect.assertions(1);
      const keyEntry = await keyEntryStorageWrapper.load('name');
      expect(keyEntry).toBeNull();
    });
  });

  describe('exists', () => {
    it("should return 'true' if entry exists", async () => {
      expect.assertions(1);
      const params = {
        name: 'name',
        value: Buffer.from('value'),
      };
      await keyEntryStorageWrapper.save(params);
      const result = await keyEntryStorageWrapper.exists(params.name);
      expect(result).toBeTruthy();
    });

    it("should return 'false' if entry does not exist", async () => {
      expect.assertions(1);
      const result = await keyEntryStorageWrapper.exists('name');
      expect(result).toBeFalsy();
    });
  });

  describe('remove', () => {
    it("should not remove entries created outside of 'KeyEntryStorageWrapper'", async () => {
      expect.assertions(1);
      const params1 = {
        name: 'name',
        value: Buffer.from('value1'),
      };
      const params2 = {
        name: params1.name,
        value: Buffer.from('value2'),
      };
      await keyEntryStorage.save(params1);
      await keyEntryStorageWrapper.save(params2);
      await keyEntryStorage.remove(params2.name);
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).toHaveLength(1);
    });
  });

  describe('list', () => {
    it("should return entries except ones created outside of 'KeyEntryStorageWrapper'", async () => {
      expect.assertions(1);
      await keyEntryStorage.save({ name: 'name', value: Buffer.from('value') });
      await keyEntryStorageWrapper.save({ name: 'name1', value: Buffer.from('value1') });
      await keyEntryStorageWrapper.save({ name: 'name2', value: Buffer.from('value2') });
      const keyEntries = await keyEntryStorageWrapper.list();
      expect(keyEntries).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update existing entry', async () => {
      expect.assertions(3);
      const params1 = {
        name: 'name',
        value: Buffer.from('value1'),
      };
      const params2 = {
        name: params1.name,
        value: Buffer.from('value2'),
        meta: {
          key: 'value',
        },
      };
      await keyEntryStorageWrapper.save(params1);
      const keyEntry = await keyEntryStorageWrapper.update(params2);
      expect(keyEntry.name).toBe(params1.name);
      expect(keyEntry.value).toEqual(params2.value);
      expect(keyEntry.meta).toEqual(params2.meta);
    });
  });

  describe('clear', () => {
    it("should delete entries except ones created outside of 'KeyEntryStorageWrapper'", async () => {
      expect.assertions(1);
      await keyEntryStorage.save({ name: 'name', value: Buffer.from('value') });
      await keyEntryStorageWrapper.save({ name: 'name1', value: Buffer.from('value1') });
      await keyEntryStorageWrapper.save({ name: 'name2', value: Buffer.from('value2') });
      await keyEntryStorageWrapper.clear();
      const keyEntries = await keyEntryStorage.list();
      expect(keyEntries).toHaveLength(1);
    });
  });
});

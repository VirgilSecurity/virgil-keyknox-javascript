import { expect } from 'chai';

import {
  creationDateKey,
  modificationDateKey,
  createKeyEntry,
  extractDate,
} from '../KeyEntryUtils';

describe('KeyEntryUtils', () => {
  describe('createKeyEntry', () => {
    const dateToString = global.Date.prototype.toISOString;
    const dateToStringValue = 'date';

    beforeEach(() => {
      global.Date.prototype.toISOString = () => dateToStringValue;
    });

    afterEach(() => {
      global.Date.prototype.toISOString = dateToString;
    });

    it('returns `IKeyEntry`', () => {
      const cloudEntry = {
        name: 'name',
        data: 'ZGF0YQ==',
        creationDate: new Date(),
        modificationDate: new Date(),
        meta: { meta: 'meta' },
      };
      const keyEntry = createKeyEntry(cloudEntry);
      expect(keyEntry.name).to.equal(cloudEntry.name);
      expect(keyEntry.value).to.equal(cloudEntry.data);
      expect(keyEntry.meta).to.eql({
        ...cloudEntry.meta,
        [creationDateKey]: dateToStringValue,
        [modificationDateKey]: dateToStringValue,
      });
    });
  });

  describe('extractDate', () => {
    it('throws it `meta` not found', () => {
      const keyEntry = {
        name: 'name',
        value: 'dmFsdWU=',
        creationDate: new Date(),
        modificationDate: new Date(),
      };
      const error = () => extractDate(keyEntry);
      expect(error).to.throw(TypeError);
    });

    it('returns `creationDate` and `modificationDate`', () => {
      const date1 = new Date(0);
      const date2 = new Date(1);
      const keyEntry = {
        name: 'name',
        value: 'dmFsdWU=',
        meta: {
          [creationDateKey]: date1.toISOString(),
          [modificationDateKey]: date2.toISOString(),
        },
        creationDate: new Date(),
        modificationDate: new Date(),
      };
      const { creationDate, modificationDate } = extractDate(keyEntry);
      expect(creationDate).to.eql(date1);
      expect(modificationDate).to.eql(date2);
    });
  });
});

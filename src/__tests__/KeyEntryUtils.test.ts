import {
  creationDateKey,
  modificationDateKey,
  createKeyEntry,
  extractDate,
} from '../KeyEntryUtils';

describe('KeyEntryUtils', () => {
  describe('createKeyEntry', () => {
    const dateToString = global.Date.prototype.toString;
    const dateToStringValue = 'date';

    beforeEach(() => {
      global.Date.prototype.toString = jest.fn(() => dateToStringValue);
    });

    afterEach(() => {
      global.Date.prototype.toString = dateToString;
    });

    it("should return 'IKeyEntry'", () => {
      const cloudEntry = {
        name: 'name',
        data: Buffer.from('data'),
        creationDate: new Date(),
        modificationDate: new Date(),
        meta: { meta: 'meta' },
      };
      const keyEntry = createKeyEntry(cloudEntry);
      expect(keyEntry.name).toBe(cloudEntry.name);
      expect(keyEntry.value).toEqual(cloudEntry.data);
      expect(keyEntry.meta).toEqual({
        ...cloudEntry.meta,
        [creationDateKey]: dateToStringValue,
        [modificationDateKey]: dateToStringValue,
      });
    });
  });

  describe('extractDate', () => {
    it("shoud throw it 'meta' not found", () => {
      const keyEntry = {
        name: 'name',
        value: Buffer.from('value'),
      };
      const error = () => extractDate(keyEntry);
      expect(error).toThrow();
    });

    it("should return 'creationDate' and 'modificationDate'", () => {
      const date = new Date(0);
      const keyEntry = {
        name: 'name',
        value: Buffer.from('value'),
        meta: {
          [creationDateKey]: date.toString(),
          [modificationDateKey]: date.toString(),
        },
      };
      const { creationDate, modificationDate } = extractDate(keyEntry);
      expect(creationDate).toEqual(date);
      expect(modificationDate).toEqual(date);
    });
  });
});

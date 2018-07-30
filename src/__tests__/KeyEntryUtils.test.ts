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
      global.Date.prototype.toISOString = jest.fn(() => dateToStringValue);
    });

    afterEach(() => {
      global.Date.prototype.toISOString = dateToString;
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
        creationDate: new Date(),
        modificationDate: new Date(),
      };
      const error = () => extractDate(keyEntry);
      expect(error).toThrow();
    });

    it("should return 'creationDate' and 'modificationDate'", () => {
      const date1 = new Date(0);
      const date2 = new Date(1);
      const keyEntry = {
        name: 'name',
        value: Buffer.from('value'),
        meta: {
          [creationDateKey]: date1.toISOString(),
          [modificationDateKey]: date2.toISOString(),
        },
        creationDate: new Date(),
        modificationDate: new Date(),
      };
      const { creationDate, modificationDate } = extractDate(keyEntry);
      expect(creationDate).toEqual(date1);
      expect(modificationDate).toEqual(date2);
    });
  });
});

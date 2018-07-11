import { serialize, deserialize } from '../CloudEntrySerializer';
import * as cloudData from './Cloud.json';

describe('CloudEntrySerializer', () => {
  test('KTC-17', () => {
    const cloudEntries = {
      [cloudData.kName1]: {
        name: cloudData.kName1,
        data: Buffer.from(cloudData.kData1, 'base64'),
        creationDate: new Date(cloudData.kCreationDate1),
        modificationDate: new Date(cloudData.kModificationDate1),
        meta: cloudData.kMeta1,
      },
      [cloudData.kName2]: {
        name: cloudData.kName2,
        data: Buffer.from(cloudData.kData2, 'base64'),
        creationDate: new Date(cloudData.kCreationDate2),
        modificationDate: new Date(cloudData.kModificationDate2),
        meta: cloudData.kMeta2,
      },
    };
    const serialized1 = serialize(cloudEntries);
    const expectedSerialized1 = Buffer.from(cloudData.kExpectedResult, 'base64');
    expect(serialized1).toEqual(expectedSerialized1);
    const deserialized = deserialize(expectedSerialized1);
    expect(deserialized).toEqual(cloudEntries);
  });

  test('KTC-18', () => {
    const result = deserialize(Buffer.alloc(0));
    expect(result).toEqual({});
  });
});

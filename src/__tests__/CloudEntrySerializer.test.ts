import { expect } from 'chai';

import { serialize, deserialize } from '../CloudEntrySerializer';
import { CloudEntry } from '../entities';
import cloudData from './Cloud.json';

describe('CloudEntrySerializer', () => {
  it('KTC-17', () => {
    const cloudEntries = new Map<string, CloudEntry>([
      [
        cloudData.kName1,
        {
          name: cloudData.kName1,
          data: cloudData.kData1,
          creationDate: new Date(cloudData.kCreationDate1),
          modificationDate: new Date(cloudData.kModificationDate1),
          meta: cloudData.kMeta1,
        },
      ],
      [
        cloudData.kName2,
        {
          name: cloudData.kName2,
          data: cloudData.kData2,
          creationDate: new Date(cloudData.kCreationDate2),
          modificationDate: new Date(cloudData.kModificationDate2),
          meta: cloudData.kMeta2,
        },
      ],
    ]);
    const serialized1 = serialize(cloudEntries);
    expect(serialized1).to.equal(cloudData.kExpectedResult);
    const deserialized = deserialize(cloudData.kExpectedResult);
    expect(deserialized).to.eql(cloudEntries);
  });

  it('KTC-18', () => {
    const result = deserialize('');
    expect(result).to.eql(new Map());
  });
});

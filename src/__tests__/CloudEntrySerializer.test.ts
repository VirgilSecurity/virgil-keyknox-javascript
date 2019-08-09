import { Buffer as NodeBuffer } from 'buffer';
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
          data: NodeBuffer.from(cloudData.kData1, 'base64'),
          creationDate: new Date(cloudData.kCreationDate1),
          modificationDate: new Date(cloudData.kModificationDate1),
          meta: cloudData.kMeta1,
        },
      ],
      [
        cloudData.kName2,
        {
          name: cloudData.kName2,
          data: NodeBuffer.from(cloudData.kData2, 'base64'),
          creationDate: new Date(cloudData.kCreationDate2),
          modificationDate: new Date(cloudData.kModificationDate2),
          meta: cloudData.kMeta2,
        },
      ],
    ]);
    const serialized1 = serialize(cloudEntries);
    const expectedSerialized1 = NodeBuffer.from(cloudData.kExpectedResult, 'base64');
    expect(serialized1.equals(expectedSerialized1)).to.be.true;
    const deserialized = deserialize(expectedSerialized1);
    expect(deserialized).to.eql(cloudEntries);
  });

  it('KTC-18', () => {
    const result = deserialize(NodeBuffer.alloc(0));
    expect(result).to.eql(new Map());
  });
});

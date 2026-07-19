import { jest } from '@jest/globals';

const mockDb = {
  collection: jest.fn(),
  batch: jest.fn(),
};

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn(),
};

mockDb.batch.mockReturnValue(mockBatch);

const mockCollection = {
  where: jest.fn(),
  doc: jest.fn(),
};

const mockQuery = {
  where: jest.fn(),
  limit: jest.fn(),
  get: jest.fn(),
};

mockDb.collection.mockReturnValue(mockCollection);
mockCollection.where.mockReturnValue(mockQuery);
mockQuery.where.mockReturnValue(mockQuery);
mockQuery.limit.mockReturnValue(mockQuery);

const mockDoc = {
  update: jest.fn(),
  get: jest.fn(),
};
mockCollection.doc.mockReturnValue(mockDoc);

jest.unstable_mockModule('./config.js', () => ({
  db: mockDb,
  FieldValue: { serverTimestamp: jest.fn(() => 'mock-timestamp') },
  LSQ_HOST: 'https://api.leadsquared.com',
  ACCESS_KEY: 'test',
  SECRET_KEY: 'test',
  fetch: jest.fn(),
}));

const mockLsqFetch = jest.fn();
jest.unstable_mockModule('./lsq.js', () => ({
  lsqFetch: mockLsqFetch,
}));

const { handlePushQueue } = await import('./pushQueue.js');
const { fetch } = await import('./config.js');

describe('handlePushQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully processes CREATE_ACTIVITY and UPDATE_ACTIVITY items', async () => {
    const doc1 = {
      id: 'q1',
      ref: { update: jest.fn() },
      data: () => ({
        action: 'CREATE_ACTIVITY',
        activityId: 'a1',
        leadId: 'l1',
        executiveId: 'e1',
        notes: 'test',
        activityData: [{ SchemaName: 'notes', Value: 'test' }],
      })
    };
    
    const doc2 = {
      id: 'q2',
      ref: { update: jest.fn() },
      data: () => ({
        action: 'UPDATE_ACTIVITY',
        activityId: 'a2',
        executiveId: 'e2',
        notes: 'test2',
        activityData: [],
      })
    };

    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      docs: [doc1, doc2]
    });

    // Mock LSQ POST call for CREATE
    mockLsqFetch.mockResolvedValueOnce({ Status: 'Success', Message: { Id: 'lsq_act_1' } });

    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ lsqActivityId: 'lsq_act_2', lsqLeadId: 'l1' })
    });

    // Mock LSQ POST call for UPDATE
    mockLsqFetch.mockResolvedValueOnce({ Status: 'Success' });

    await handlePushQueue({ data: doc1, params: { docId: 'q1' } });
    await handlePushQueue({ data: doc2, params: { docId: 'q2' } });

    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ lsqActivityId: 'lsq_act_1' }));
    expect(doc1.ref.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(doc2.ref.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });
  
  test('does nothing when snapshot is null', async () => {
    await handlePushQueue({ data: null, params: { docId: 'q3' } });
    expect(fetch).not.toHaveBeenCalled();
  });
});

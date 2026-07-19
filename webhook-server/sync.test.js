import { jest } from '@jest/globals';

// Mock config.js
const mockDb = {
  collection: jest.fn(),
  batch: jest.fn(),
};

const mockBatch = {
  set: jest.fn(),
  commit: jest.fn(),
};

mockDb.batch.mockReturnValue(mockBatch);

const mockCollection = {
  get: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
};

const mockQuery = {
  get: jest.fn(),
};

mockDb.collection.mockReturnValue(mockCollection);
mockCollection.where.mockReturnValue(mockQuery);

jest.unstable_mockModule('./config.js', () => ({
  db: mockDb,
  LSQ_HOST: 'https://api.leadsquared.com',
  ACCESS_KEY: 'test',
  SECRET_KEY: 'test',
  SYNC_LOOKBACK_MINUTES: 30,
  fetch: jest.fn(),
}));

// Mock lsq.js
const mockLsqFetch = jest.fn();
jest.unstable_mockModule('./lsq.js', () => ({
  lsqFetch: mockLsqFetch,
  parseActivityData: jest.fn(() => ({})),
  buildFirestoreDoc: jest.fn(() => ({ id: 'doc1' })),
}));

const { syncActivities } = await import('./sync.js');
const { fetch } = await import('./config.js');

describe('syncActivities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the users collection get()
    mockCollection.get.mockResolvedValue({
      forEach: (cb) => {
        cb({ id: 'user1', data: () => ({ email: 'test@example.com' }) });
      }
    });
    
    // Mock crmActivities 'in' query
    mockQuery.get.mockResolvedValue({
      forEach: () => {}
    });
    
    mockCollection.doc.mockReturnValue({ id: 'docRef1' });
    mockBatch.commit.mockResolvedValue(undefined);
  });

  test('successfully fetches and processes activities in bulk', async () => {
    // 1. Mock the bulk fetch (first page has 1 item, second page has 0 to break loop)
    fetch
      .mockResolvedValueOnce({
        json: async () => ({
          List: [
            { RelatedProspectId: 'lead_1', ProspectActivityId: 'act_1' }
          ]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ProspectActivities: [
            { ActivityId: 'act_1', Latitude: '12.0', Longitude: '77.0' }
          ]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({ List: [] }) // End of pages
      });

    // Mock Lead name fetch
    mockLsqFetch.mockResolvedValueOnce([
      { FirstName: 'Test', LastName: 'School' }
    ]);

    const result = await syncActivities();
    
    expect(result.activitiesFetched).toBe(1);
    expect(result.activitiesWritten).toBe(1);
    expect(result.error).toBeNull();
    
    // Verify db.batch was called
    expect(mockDb.batch).toHaveBeenCalled();
    expect(mockBatch.set).toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  test('returns 0 when no activities are fetched', async () => {
    // 1. Mock bulk fetch returning empty array
    fetch.mockResolvedValueOnce({
      json: async () => ({ List: [] })
    });

    const result = await syncActivities();
    
    expect(result.activitiesFetched).toBe(0);
    expect(result.activitiesWritten).toBe(0);
  });
});

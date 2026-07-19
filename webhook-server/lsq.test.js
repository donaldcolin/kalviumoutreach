import { jest } from '@jest/globals';

// Mock config.js using ES modules compatible syntax
jest.unstable_mockModule('./config.js', () => {
  return {
    LSQ_HOST: 'https://api.leadsquared.com',
    ACCESS_KEY: 'test-access',
    SECRET_KEY: 'test-secret',
    FieldValue: {
      serverTimestamp: jest.fn(() => 'mock-server-timestamp'),
    },
    fetch: jest.fn(),
  };
});

// We must dynamically import the module under test AFTER unstable_mockModule
const { parseActivityData, buildFirestoreDoc } = await import('./lsq.js');

describe('parseActivityData', () => {
  test('parses direct mx_Custom fields', () => {
    const raw = {
      mx_Custom_1: 'Walk-In',
      mx_Custom_2: 'First Visit',
      ActivityEvent_Note: 'Test note',
      OtherField: 'Should be ignored'
    };
    
    const parsed = parseActivityData(raw);
    
    expect(parsed.mx_Custom_1).toBe('Walk-In');
    expect(parsed.mx_Custom_2).toBe('First Visit');
    expect(parsed.ActivityEvent_Note).toBe('Test note');
    expect(parsed.OtherField).toBeUndefined();
  });

  test('parses ActivityData string array (JSON)', () => {
    const raw = {
      ActivityData: JSON.stringify([
        { SchemaName: 'mx_Custom_1', Value: 'Walk-In' },
        { Key: 'mx_Custom_2', Attribute: 'First Visit' }
      ])
    };
    
    const parsed = parseActivityData(raw);
    
    expect(parsed.mx_Custom_1).toBe('Walk-In');
    expect(parsed.mx_Custom_2).toBe('First Visit');
  });

  test('parses ActivityData raw array', () => {
    const raw = {
      ActivityData: [
        { SchemaName: 'mx_Custom_3', Value: 'https://photo.url' }
      ]
    };
    
    const parsed = parseActivityData(raw);
    
    expect(parsed.mx_Custom_3).toBe('https://photo.url');
  });

  test('parses Data string array (JSON)', () => {
    const raw = {
      Data: JSON.stringify([
        { Key: 'mx_Custom_4', Value: 'Met PIC' }
      ])
    };
    
    const parsed = parseActivityData(raw);
    
    expect(parsed.mx_Custom_4).toBe('Met PIC');
  });

  test('parses Fields object', () => {
    const raw = {
      Fields: {
        mx_Custom_5: 'Not interested',
        mx_Custom_6: '2023-10-01'
      }
    };
    
    const parsed = parseActivityData(raw);
    
    expect(parsed.mx_Custom_5).toBe('Not interested');
    expect(parsed.mx_Custom_6).toBe('2023-10-01');
  });
});

describe('buildFirestoreDoc', () => {
  const emailMap = {
    'john@example.com': 'user_john',
  };

  test('builds correct firestore document from slim payload', () => {
    const raw = {
      ProspectActivityId: 'act_123',
      RelatedProspectId: 'lead_456',
      CreatedByEmailAddress: 'John@Example.com', // testing case insensitivity
      CreatedOn: '2023-10-01T10:00:00',
      ModifiedOn: '2023-10-01T10:05:00',
      LeadName: 'Test School',
    };
    
    const fields = {
      mx_Custom_2: 'Walk-In',
      ActivityEvent_Note: 'Met principal',
      mx_Custom_34: '12.97, 77.59',
    };

    const doc = buildFirestoreDoc(raw, fields, emailMap);

    expect(doc.lsqActivityId).toBe('act_123');
    expect(doc.lsqLeadId).toBe('lead_456');
    expect(doc.executiveId).toBe('user_john'); // mapped
    expect(doc.executiveEmail).toBe('john@example.com');
    expect(doc.schoolName).toBe('Test School');
    expect(doc.activityType).toBe('Walk-In');
    expect(doc.notes).toBe('Met principal');
    
    // GPS parsing test
    expect(doc.lat).toBe(12.97);
    expect(doc.lng).toBe(77.59);
    
    // Date formats (adds Z if missing)
    expect(doc.lsqCreatedOn).toBe('2023-10-01T10:00:00Z');
  });

  test('parses JSON GPS location correctly', () => {
    const raw = { ProspectActivityId: 'act_2' };
    const fields = {
      mx_Custom_34: '{"Latitude": 13.08, "Longitude": 80.27}'
    };
    const doc = buildFirestoreDoc(raw, fields, emailMap);
    
    expect(doc.lat).toBe(13.08);
    expect(doc.lng).toBe(80.27);
  });

  test('falls back to raw Latitude/Longitude if mx_Custom_34 is missing', () => {
    const raw = { 
      ProspectActivityId: 'act_3',
      Latitude: '28.61',
      Longitude: '77.20'
    };
    const fields = {};
    const doc = buildFirestoreDoc(raw, fields, emailMap);
    
    expect(doc.lat).toBe(28.61);
    expect(doc.lng).toBe(77.20);
  });

  test('handles missing or malformed GPS gracefully (null)', () => {
    const raw = { ProspectActivityId: 'act_4' };
    const fields = {
      mx_Custom_34: 'invalid string'
    };
    const doc = buildFirestoreDoc(raw, fields, emailMap);
    
    expect(doc.lat).toBeNull();
    expect(doc.lng).toBeNull();
  });
});

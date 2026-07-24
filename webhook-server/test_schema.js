import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  // Get activity types to find the right event
  const typesRes = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/ActivityTypes.Get?accessKey=${AK}&secretKey=${SK}`);
  const types = await typesRes.json();
  const event232 = (Array.isArray(types) ? types : []).find(t => t.ActivityEvent == 232);
  console.log('Event 232 type:', JSON.stringify(event232, null, 2));

  // Try to create an activity with JUST the basic fields (no mx_Custom_5) to see if it works
  console.log('\n=== Testing minimal activity creation ===');
  const leadId = 'b59c4989-1003-4ca8-80bc-d5cf3584c41d';
  
  const testBody = {
    RelatedProspectId: leadId,
    ActivityEvent: 232,
    ActivityNote: 'TEST - will delete',
    ActivityDateTime: new Date().toISOString().replace('T', ' ').split('.')[0],
    Fields: [
      { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
      { SchemaName: 'mx_Custom_4', Value: 'Refused Entry - RE' },
      { SchemaName: 'mx_Custom_1', Value: new Date().toISOString().replace('T', ' ').split('.')[0] },
    ]
  };
  
  console.log('Body without mx_Custom_5:', JSON.stringify(testBody, null, 2));
  const createRes = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/Create?accessKey=${AK}&secretKey=${SK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testBody)
  });
  const result = await createRes.json();
  console.log('Result (no mx_Custom_5):', JSON.stringify(result));
  
  // Now test WITH mx_Custom_5 and various values
  const testValues = [
    'Did not get permission to enter',
    'Security/Front Desk denied entry',
    'Other',
    'Did Not Get Permission To Enter',
    'Security / Front Desk Denied Entry',
  ];
  
  for (const val of testValues) {
    const body2 = {
      RelatedProspectId: leadId,
      ActivityEvent: 232,
      ActivityNote: 'TEST dropdown val',
      ActivityDateTime: new Date().toISOString().replace('T', ' ').split('.')[0],
      Fields: [
        { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
        { SchemaName: 'mx_Custom_4', Value: 'Refused Entry - RE' },
        { SchemaName: 'mx_Custom_5', Value: val },
      ]
    };
    const r = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/Create?accessKey=${AK}&secretKey=${SK}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body2)
    });
    const res = await r.json();
    console.log(`mx_Custom_5 = "${val}" → ${res.Status === 'Success' ? '✅ SUCCESS' : '❌ FAILED: ' + (res.ExceptionMessage || JSON.stringify(res))}`);
  }
}
main().catch(console.error);

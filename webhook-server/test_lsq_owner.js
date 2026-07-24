import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  const leadId = 'b59c4989-1003-4ca8-80bc-d5cf3584c41d';
  const ownerEmail = 'tejas.n@kalvium.com';
  
  const testBody = {
    RelatedProspectId: leadId,
    ActivityEvent: 232,
    ActivityNote: 'TEST owner payload 2',
    ActivityDateTime: new Date().toISOString().replace('T', ' ').split('.')[0],
    CreatedBy: ownerEmail,
    OwnerId: ownerEmail,
    Fields: [
      { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
      { SchemaName: 'mx_Custom_4', Value: 'Refused Entry - RE' },
      { SchemaName: 'mx_Custom_1', Value: new Date().toISOString().replace('T', ' ').split('.')[0] },
    ]
  };
  
  const createRes = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/Create?accessKey=${AK}&secretKey=${SK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testBody)
  });
  const result = await createRes.json();
  console.log('Result (CreatedBy/OwnerId in payload):', JSON.stringify(result));
}
main().catch(console.error);

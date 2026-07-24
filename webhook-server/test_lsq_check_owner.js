import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  const activityId = '931ff2eb-d891-4e68-b7c0-9fd441f8d0b0'; 
  const leadId = 'b59c4989-1003-4ca8-80bc-d5cf3584c41d';
  
  const res = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/Retrieve?accessKey=${AK}&secretKey=${SK}&leadId=${leadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Parameter: { ActivityEvent: 232 },
      Paging: { Offset: 0, RowCount: 10 }
    })
  });
  const data = await res.json();
  const acts = data.ProspectActivities || [];
  
  const targetAct = acts.find(a => a.Id === activityId);
  console.log(JSON.stringify(targetAct, null, 2));
}
main().catch(console.error);

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  // Fetch recent activities to see valid dropdown values
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30*24*60*60*1000);
  const fmt = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} 00:00:00`;

  const res = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/CustomActivity/RetrieveByActivityEvent?accessKey=${AK}&secretKey=${SK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Parameter: { ActivityEvent: 232, FromDate: fmt(monthAgo), ToDate: fmt(now) },
      Paging: { PageIndex: 1, PageSize: 100 },
      Sorting: { ColumnName: 'ModifiedOn', Direction: 1 }
    })
  });
  const data = await res.json();
  const batch = Array.isArray(data) ? data : [];
  
  console.log('Total activities:', batch.length);
  console.log('Unique mx_Custom_5 values:', [...new Set(batch.map(a => a.mx_Custom_5).filter(Boolean))]);
  console.log('Unique mx_Custom_4 values:', [...new Set(batch.map(a => a.mx_Custom_4).filter(Boolean))]);
  console.log('Unique mx_Custom_7 values:', [...new Set(batch.map(a => a.mx_Custom_7).filter(Boolean))]);
  console.log('Unique mx_Custom_8 values:', [...new Set(batch.map(a => a.mx_Custom_8).filter(Boolean))]);
  console.log('Unique mx_Custom_9 values:', [...new Set(batch.map(a => a.mx_Custom_9).filter(Boolean))]);
  console.log('Unique mx_Custom_36 values:', [...new Set(batch.map(a => a.mx_Custom_36).filter(Boolean))]);
}
main().catch(console.error);

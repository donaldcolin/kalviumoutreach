import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  const res = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/CustomActivity/Schema/Retrieve?accessKey=${AK}&secretKey=${SK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ActivityEvent: 232 })
  });
  const data = await res.json();
  const fields = data.ActivityFields || [];
  
  // Print all dropdown fields with their valid options
  for (const f of fields) {
    if (f.OptionSet && f.OptionSet !== '') {
      try {
        const opts = JSON.parse(f.OptionSet);
        const validValues = opts.map(o => o.Value).filter(v => v !== '');
        console.log(`\n${f.SchemaName} (${f.DisplayName}) [${f.DataType}]:`);
        validValues.forEach(v => console.log(`  → "${v}"`));
      } catch {}
    }
  }
}
main().catch(console.error);

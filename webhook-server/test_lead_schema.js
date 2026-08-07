import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  try {
    const res = await lsqFetch('/v2/LeadManagement.svc/LeadsMetaData.Get', 'GET');
    const fields = res.map(f => f.SchemaName);
    console.log("Fields:", fields.join(', '));
  } catch(e) {
    console.error(e);
  }
}
main();

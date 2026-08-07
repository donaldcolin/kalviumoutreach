import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  try {
    const res = await lsqFetch('/v2/LeadManagement.svc/Leads.GetById?id=fcac9b0d-e012-41f9-b0b8-b46fe8cffd7d', 'GET');
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}
main();

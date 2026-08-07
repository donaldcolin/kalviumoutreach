import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  const leadBody = [
    { Attribute: "FirstName", Value: "Test School Owner Assignment" },
    { Attribute: "Phone", Value: "9999999990" },
    { Attribute: "OwnerId", Value: "darshan.s@kalvium.com" },
    { Attribute: "Source", Value: "School_Outreach_2027" },
    { Attribute: "SearchBy", Value: "Phone" }
  ];
  
  try {
    const res = await lsqFetch('/v2/LeadManagement.svc/Lead.Create', 'POST', leadBody);
    console.log(res);
  } catch(e) {
    console.error(e);
  }
}
main();

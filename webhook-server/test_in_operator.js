import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  const searchBody = {
    "Parameter": {
      "LookupName": "OwnerIdEmailAddress",
      "LookupValue": "tejas.n@kalvium.com, madiha.m@kalvium.com", // Try comma separated
      "SqlOperator": "in"
    },
    "Columns": {
      "Include_CSV": "ProspectID,FirstName,OwnerIdEmailAddress"
    },
    "Paging": {
      "PageIndex": 1,
      "PageSize": 5
    }
  };

  console.log("Trying POST /v2/LeadManagement.svc/Leads.Get with 'in' operator...");
  try {
    const lsqResp = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', searchBody);
    console.log("Response:", JSON.stringify(lsqResp, null, 2));
  } catch(e) {
    console.log("Error:", e);
  }
}
main().catch(console.error);

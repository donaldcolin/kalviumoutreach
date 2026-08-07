import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  const leadBody = [
    { Attribute: "FirstName", Value: "owner assignment test" },
    { Attribute: "Phone", Value: "+91-9100000000" },
    { Attribute: "Source", Value: "School_Outreach_2027" },
    { Attribute: "ProspectStage", Value: "School Prospect" },
    { Attribute: "OwnerId", Value: "583f46e4-c455-11ef-be59-0259d35f5843" } // Donald's ID
  ];
  
  try {
    const res = await lsqFetch('/v2/LeadManagement.svc/Lead.Create', 'POST', leadBody);
    console.log(JSON.stringify(res, null, 2));
    
    if (res.Message && res.Message.Id) {
      const getRes = await lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${res.Message.Id}`, 'GET');
      console.log('OwnerId in LSQ:', getRes[0].OwnerId, getRes[0].OwnerIdName);
    }
  } catch(e) {
    console.error(e);
  }
}
main();

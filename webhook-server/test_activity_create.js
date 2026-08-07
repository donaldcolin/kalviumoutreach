import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  const leadId = 'dce93100-521c-47ac-9492-11a726a526c9'; // The lead created earlier assigned to Tejas N

  // 1. Test Activity Create
  const activityBody = {
    "RelatedProspectId": leadId,
    "ActivityEvent": 282,
    "ActivityNote": "Auto-created by Outreach App",
    "Fields": [
      { "SchemaName": "mx_Custom_1", "Value": "donald.colin@kalvium.com" },
      { "SchemaName": "mx_Custom_2", "Value": new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { "SchemaName": "mx_Custom_3", "Value": "12.9716" },
      { "SchemaName": "mx_Custom_4", "Value": "77.5946" }
    ]
  };
  
  try {
    const actRes = await lsqFetch('/v2/ProspectActivity.svc/Create', 'POST', activityBody);
    console.log("Activity Create Result:", JSON.stringify(actRes, null, 2));
  } catch(e) {
    console.error("Activity Create Error:", e);
  }

  // 2. Test Lead Update (OwnerId)
  // Target OwnerId is Donald Colin's ID
  const updateBody = [
    { "Attribute": "OwnerId", "Value": "583f46e4-c455-11ef-be59-0259d35f5843" }
  ];
  try {
    const updRes = await lsqFetch(`/v2/LeadManagement.svc/Lead.Update?leadId=${leadId}`, 'POST', updateBody);
    console.log("Lead Update Result:", JSON.stringify(updRes, null, 2));
  } catch (e) {
    console.error("Lead Update Error:", e);
  }
}
main();

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

let lsqUsersCache = null;
let lsqUsersCacheTime = 0;

async function getLsqOwnerIdByEmail(email) {
  if (!lsqUsersCache || Date.now() - lsqUsersCacheTime > 15 * 60 * 1000) {
    const users = await lsqFetch('/v2/UserManagement.svc/Users.Get', 'GET');
    if (Array.isArray(users)) {
      lsqUsersCache = users;
      lsqUsersCacheTime = Date.now();
    }
  }
  const user = lsqUsersCache.find(u => u.EmailAddress && u.EmailAddress.toLowerCase() === email.toLowerCase());
  return user ? user.ID : null;
}

async function simulateLeadCreate(email, schoolName, phone) {
    const ownerId = await getLsqOwnerIdByEmail(email);
    console.log(`Resolved owner ID for ${email}:`, ownerId);
    
    const leadBody = [
      { Attribute: "FirstName", Value: schoolName },
      { Attribute: "Phone", Value: phone },
      { Attribute: "Source", Value: "School_Outreach_2027" },
      { Attribute: "ProspectStage", Value: "School Prospect" }
    ];
    if (ownerId) leadBody.push({ Attribute: "OwnerId", Value: ownerId });

    console.log("Creating lead...");
    const lsqResp = await lsqFetch('/v2/LeadManagement.svc/Lead.Create', 'POST', leadBody);
    console.log("Lead Create Resp:", lsqResp.Message);
    const leadId = lsqResp.Message.Id;

    console.log("Creating activity...");
    const activityBody = {
      "RelatedProspectId": leadId,
      "ActivityEvent": 282,
      "Fields": [
        { "SchemaName": "mx_Custom_1", "Value": email },
        { "SchemaName": "mx_Custom_2", "Value": new Date().toISOString().replace('T', ' ').substring(0, 19) },
        { "SchemaName": "mx_Custom_3", "Value": "12.0" },
        { "SchemaName": "mx_Custom_4", "Value": "77.0" }
      ]
    };
    await lsqFetch('/v2/ProspectActivity.svc/Create', 'POST', activityBody);

    console.log("Updating owner...");
    if (ownerId) {
      await lsqFetch(`/v2/LeadManagement.svc/Lead.Update?leadId=${leadId}`, 'POST', [{ "Attribute": "OwnerId", "Value": ownerId }]);
    }
    
    console.log("Done! LeadID:", leadId);
    
    const verify = await lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${leadId}`, 'GET');
    console.log("Verified Owner in LSQ:", verify[0].OwnerIdName);
}

async function main() {
  console.log('--- Test: Donald (Admin) - X1 School ---');
  await simulateLeadCreate('donald.colin@kalvium.com', 'X1 School', '+91-91' + Date.now().toString().slice(-8));
  
  console.log('\n--- Test: Darshan (Associate) - X2 School ---');
  await simulateLeadCreate('darshan.s@kalvium.com', 'X2 School', '+91-91' + Date.now().toString().slice(-8));
}

main().catch(console.error);

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

import app from './routes.js';

const PORT = 5006;
const server = app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  
  async function createLead(payload) {
    const response = await fetch(`http://localhost:${PORT}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  try {
    console.log('\n--- Test 2: Darshan (Associate) - X2 School ---');
    const res2 = await createLead({
      email: 'darshan.s@kalvium.com',
      schoolName: 'X2 School',
      phone: '9199' + Date.now().toString().slice(-6),
      latitude: '13.0827',
      longitude: '80.2707'
    });
    console.log('Result:', res2);

    if (res2.data.leadId) {
      const check2 = await lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${res2.data.leadId}`, 'GET');
      console.log('Lead Owner in LSQ:', check2[0].OwnerIdName, '(', check2[0].OwnerId, ')');

      const act2 = await lsqFetch(`/v2/ProspectActivity.svc/Retrieve`, 'POST', {
        "Parameter": {
           "LeadId": res2.data.leadId,
           "ActivityEvent": 282
        }
      });
      console.log('Activity 282 count:', act2.List ? act2.List.length : 0);
      if (act2.List && act2.List.length > 0) {
         console.log('Activity Fields:', JSON.stringify(act2.List[0], null, 2));
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    server.close();
    process.exit(0);
  }
});

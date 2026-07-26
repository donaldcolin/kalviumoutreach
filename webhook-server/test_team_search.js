import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function fetchTeamLeads(teamEmails) {
  let allLeads = [];
  let pageIndex = 1;
  const pageSize = 1000;

  while (true) {
    const searchBody = {
      "Parameter": {
        "LookupName": "OwnerIdEmailAddress",
        "LookupValue": teamEmails.join(','),
        "SqlOperator": "in"
      },
      "Columns": {
        "Include_CSV": "ProspectID,FirstName,LastName,OwnerIdEmailAddress,ProspectStage"
      },
      "Paging": {
        "PageIndex": pageIndex,
        "PageSize": pageSize
      }
    };

    const lsqResp = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', searchBody);
    const leads = Array.isArray(lsqResp) ? lsqResp : [];
    
    allLeads = allLeads.concat(leads);

    if (leads.length < pageSize) {
      break; // Reached the end
    }
    pageIndex++;
    
    if (pageIndex > 5) {
      break; // Safeguard to prevent infinite loops (max 5000 leads per team)
    }
  }
  
  return allLeads;
}

async function main() {
  const teamEmails = ['tejas.n@kalvium.com']; 
  console.log(`Fetching leads for team: ${teamEmails.join(',')}`);
  const leads = await fetchTeamLeads(teamEmails);
  console.log(`Total leads fetched: ${leads.length}`);
  
  const q = 'a';
  const filtered = leads.filter(l => 
    l.ProspectStage === 'New Lead' && // Test with 'New Lead' since we saw those earlier
    (l.FirstName || '').toLowerCase().includes(q.toLowerCase())
  );
  console.log(`Filtered leads matching '${q}' and 'New Lead': ${filtered.length}`);
}

main().catch(console.error);

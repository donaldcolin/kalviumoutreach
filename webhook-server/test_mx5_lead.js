import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  // The lead from the screenshot URL: b59c4989-1003-4ca8-80bc-d5cf3584c41d
  const leadId = 'b59c4989-1003-4ca8-80bc-d5cf3584c41d';
  
  // Fetch all activities for this specific lead
  const res = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/Retrieve?accessKey=${AK}&secretKey=${SK}&leadId=${leadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Parameter: { ActivityEvent: 232 },
      Paging: { Offset: 0, RowCount: 50 }
    })
  });
  const data = await res.json();
  const acts = data.ProspectActivities || [];
  
  console.log('Total 232 activities for this lead:', acts.length);
  
  for (const act of acts) {
    console.log('\n--- Activity:', act.Id, '---');
    console.log('Note:', act.ActivityNote?.substring(0, 100));
    console.log('CreatedOn:', act.CreatedOn);
    
    // Parse ActivityData
    let fields = {};
    if (act.ActivityData) {
      let arr;
      try { arr = typeof act.ActivityData === 'string' ? JSON.parse(act.ActivityData) : act.ActivityData; } catch { arr = []; }
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          fields[item.SchemaName || item.Key] = item.Value;
        });
      }
    }
    console.log('mx_Custom_4 (status):', fields.mx_Custom_4 || 'N/A');
    console.log('mx_Custom_5 (refusal):', fields.mx_Custom_5 || 'N/A');
    console.log('mx_Custom_36 (type):', fields.mx_Custom_36 || 'N/A');
    console.log('All fields:', JSON.stringify(fields, null, 2));
  }

  // Also try Schema API
  console.log('\n=== Activity Schema ===');
  const schemaRes = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/CustomActivity/Schema/Retrieve?accessKey=${AK}&secretKey=${SK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ActivityEvent: 232 })
  });
  const schema = await schemaRes.json();
  const schemaFields = Array.isArray(schema) ? schema : (schema.ActivityFields || schema.List || []);
  
  const target = schemaFields.find(f => f.SchemaName === 'mx_Custom_5');
  if (target) {
    console.log('\nmx_Custom_5 schema:', JSON.stringify(target, null, 2));
  } else {
    console.log('\nmx_Custom_5 not in schema. All fields:');
    schemaFields.forEach(f => console.log(`  ${f.SchemaName}: ${f.DisplayName} [${f.DataType}] Options: ${f.DropdownOptions || f.Options || 'N/A'}`));
  }
}
main().catch(console.error);

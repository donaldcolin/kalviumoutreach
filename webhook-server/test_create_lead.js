import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

async function main() {
  const res = await fetch(`${LSQ_HOST}/v2/LeadManagement.svc/Lead.Create?accessKey=${AK}&secretKey=${SK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { Attribute: "FirstName", Value: "Test" },
      { Attribute: "LastName", Value: "Lead" },
      { Attribute: "EmailAddress", Value: "test.lead.app@kalvium.com" },
      { Attribute: "Phone", Value: "+919876543210" },
      { Attribute: "mx_Street1", Value: "Sample Street" },
      { Attribute: "mx_City", Value: "Bangalore" }
    ])
  });
  const data = await res.json();
  console.log('Response:', data);
}
main().catch(console.error);

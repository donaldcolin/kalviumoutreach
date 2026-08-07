import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import app from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const PORT = 5005;

async function runTests() {
  const server = app.listen(PORT, async () => {
    try {
      console.log('Server listening on port', PORT);

      // Helper function to send API requests
      const createLead = async (payload) => {
        const res = await fetch(`http://localhost:${PORT}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        return { status: res.status, data };
      };

      const now = new Date().getTime();

      // Test 1: Donald (Admin)
      const donaldPhone = `918757${now.toString().slice(-4)}`; // Generate unique phone to avoid duplicate errors on first try
      console.log(`\n--- Test 1: Donald (Admin) - Phone: ${donaldPhone} ---`);
      const res1 = await createLead({
        email: 'donald.colin@kalvium.com',
        schoolName: `donald test ${now}`,
        phone: donaldPhone
      });
      console.log('Result:', res1);

      // Test 2: Duplicate Phone (Should Fail)
      console.log(`\n--- Test 2: Duplicate Phone - Phone: ${donaldPhone} ---`);
      const res2 = await createLead({
        email: 'darshan.s@kalvium.com',
        schoolName: 'Duplicate Test',
        phone: donaldPhone
      });
      console.log('Result:', res2);

      // Test 3: Darshan (Associate)
      const darshanPhone = `919999${now.toString().slice(-4)}`;
      console.log(`\n--- Test 3: Darshan (Associate) - Phone: ${darshanPhone} ---`);
      const res3 = await createLead({
        email: 'darshan.s@kalvium.com',
        schoolName: `darshan test ${now}`,
        phone: darshanPhone
      });
      console.log('Result:', res3);

      // Test 4: Missing Required Fields (Should Fail)
      console.log(`\n--- Test 4: Missing Required Fields ---`);
      const res4 = await createLead({
        email: 'donald.colin@kalvium.com',
        schoolName: '',
        phone: ''
      });
      console.log('Result:', res4);

    } catch (e) {
      console.error('Test error:', e);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();

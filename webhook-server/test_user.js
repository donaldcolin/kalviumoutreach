import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { lsqFetch } from './lsq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

async function main() {
  try {
    const res = await lsqFetch('/v2/UserManagement.svc/Users.Get', 'GET');
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}
main();

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
    try {
      const users = await lsqFetch('/v2/UserManagement.svc/Users.Get', 'GET');
      if (Array.isArray(users)) {
        lsqUsersCache = users;
        lsqUsersCacheTime = Date.now();
      }
    } catch (err) {
      console.error('Failed to fetch LSQ users for owner mapping:', err);
    }
  }
  
  if (Array.isArray(lsqUsersCache)) {
    console.log("Cache has", lsqUsersCache.length, "users");
    const user = lsqUsersCache.find(u => u.EmailAddress && u.EmailAddress.toLowerCase() === email.toLowerCase());
    return user ? user.ID : null;
  }
  return null;
}

async function main() {
  const id1 = await getLsqOwnerIdByEmail('donald.colin@kalvium.com');
  console.log('Donald ID:', id1);
  const id2 = await getLsqOwnerIdByEmail('darshan.s@kalvium.com');
  console.log('Darshan ID:', id2);
}
main();

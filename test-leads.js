import fetch from 'node-fetch';
async function test() {
  const res = await fetch('https://api-br5zfz4zta-uc.a.run.app/api/leads?email=aditya.narayan@kalvium.com');
  console.log(res.status, await res.text());
}
test().catch(console.error);

const { Client } = require('pg');

const host = 'db.hricdgrdvyaowhvevxok.supabase.co';
const port = 6543;
const user = 'postgres';
const database = 'postgres';

const passwords = [
  'Adil123#',
  '[Adil123#]',
  'Adil123',
  'TGVINCENZO',
  'assignai-prod-secret-f4z1l-p4sh4-2026-enterprise-k3y'
];

async function testPasswords() {
  for (const password of passwords) {
    console.log(`Testing password: "${password}"`);
    const client = new Client({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log(`✅ Success! The password is: "${password}"`);
      await client.end();
      return;
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
}

testPasswords();

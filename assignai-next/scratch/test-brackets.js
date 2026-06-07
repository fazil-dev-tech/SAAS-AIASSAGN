const { Client } = require('pg');

const connectionString = 'postgresql://postgres:%5BAdil123%23%5D@db.hricdgrdvyaowhvevxok.supabase.co:6543/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected successfully with password: [Adil123#] on port 6543!');
    await client.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

main();

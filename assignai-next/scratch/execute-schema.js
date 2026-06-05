const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const connectionString = 'postgresql://postgres:Adil123%23@db.hricdgrdvyaowhvevxok.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Supabase DB!");
    const sql = fs.readFileSync('scratch/schema.sql', 'utf8');
    await client.query(sql);
    console.log("Schema successfully executed!");
  } catch (err) {
    console.error("Database connection/execution failed:", err.message);
  } finally {
    await client.end();
  }
}

run();

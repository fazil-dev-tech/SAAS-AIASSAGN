const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes if any
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

let connectionString = process.env.DATABASE_URL;

if (connectionString && connectionString.includes('#')) {
  // Safe URL encoding of '#' to '%23' in the connection string password
  const parts = connectionString.split('@');
  if (parts.length > 1) {
    const userinfo = parts[0];
    const rest = parts.slice(1).join('@');
    const userinfoParts = userinfo.split(':');
    if (userinfoParts.length > 2) {
      const password = userinfoParts.slice(2).join(':');
      const encodedPassword = encodeURIComponent(password);
      parts[0] = `${userinfoParts[0]}:${userinfoParts[1]}:${encodedPassword}`;
      connectionString = parts.join('@');
    }
  }
}

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL not found in environment!');
  process.exit(1);
}

console.log('Connecting to database...');
const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to database successfully.');

    const sqlPath = path.join(__dirname, 'secure_db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Executing SQL locking script...');
    const res = await client.query(sql);
    
    console.log('SQL Execution complete. Row Level Security Status:');
    // Log tables row security status
    const statusRes = await client.query(`
      SELECT tablename, rowsecurity FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('users', 'otps', 'reports');
    `);
    
    statusRes.rows.forEach(row => {
      console.log(`  Table: ${row.tablename} | RLS Enabled: ${row.rowsecurity}`);
    });
    
  } catch (err) {
    console.error('\n❌ Database Configuration Error:', err.message);
    console.log('\n================================================================================');
    console.log('👉 PORT 5432 / PASSWORD AUTHENTICATION ISSUES?');
    console.log('If your connection to Postgres is blocked (e.g. password mismatch or firewalls),');
    console.log('please apply the Row Level Security (RLS) policies manually:');
    console.log('1. Open your Supabase Dashboard (https://supabase.com)');
    console.log('2. Navigate to the SQL Editor.');
    console.log('3. Copy the entire SQL contents from scratch/secure_db.sql.');
    console.log('4. Paste the SQL and run it.');
    console.log('================================================================================\n');
  } finally {
    await client.end();
  }
}

main();

const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const getVal = (key) => {
  const match = env.match(new RegExp(`${key}\\s*=\\s*(.*)`));
  return match ? match[1].trim().replace(/['"]/g, '') : '';
};
const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
const key = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(url, key);

async function check() {
  const tables = ['users', 'profiles', 'otps', 'reports'];
  for (const table of tables) {
    const { error } = await sb.from(table).select('*').limit(1);
    console.log(`Table ${table} query result:`, error ? `Error: ${error.message}` : 'Success');
  }
}
check();

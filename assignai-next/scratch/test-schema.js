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
  const { data: otps, error: err1 } = await sb.from('otps').select('*').limit(1);
  console.log('otps record:', otps, err1);
  const { data: reports, error: err2 } = await sb.from('reports').select('*').limit(1);
  console.log('reports record:', reports, err2);
}
check();

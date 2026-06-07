const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hricdgrdvyaowhvevxok.supabase.co';
const supabaseKey = 'sb_publishable_uCIIKIWyWNP6v2DDI8yBeg_sOJvOQr4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('--- DETAILED SECURITY POLICY CHECK ---');
  
  // Test users select
  const { data: users, error: usersError } = await supabase.from('users').select('*');
  console.log('Users Select:', { data: users, error: usersError });

  // Test otps select
  const { data: otps, error: otpsError } = await supabase.from('otps').select('*');
  console.log('OTPs Select:', { data: otps, error: otpsError });

  // Test reports select
  const { data: reports, error: reportsError } = await supabase.from('reports').select('*');
  console.log('Reports Select:', { data: reports, error: reportsError });
}

checkRLS();

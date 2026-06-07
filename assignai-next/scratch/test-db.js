const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hricdgrdvyaowhvevxok.supabase.co';
const supabaseKey = 'sb_publishable_uCIIKIWyWNP6v2DDI8yBeg_sOJvOQr4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test users table
  const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1);
  if (usersError) {
    console.error('❌ Error querying users table:', usersError.message, usersError.code);
  } else {
    console.log('✅ Users table connection successful. Found', users.length, 'records.');
  }

  // Test otps table
  const { data: otps, error: otpsError } = await supabase.from('otps').select('*').limit(1);
  if (otpsError) {
    console.error('❌ Error querying otps table:', otpsError.message, otpsError.code);
  } else {
    console.log('✅ Otps table connection successful. Found', otps.length, 'records.');
  }

  // Test reports table
  const { data: reports, error: reportsError } = await supabase.from('reports').select('*').limit(1);
  if (reportsError) {
    console.error('❌ Error querying reports table:', reportsError.message, reportsError.code);
  } else {
    console.log('✅ Reports table connection successful. Found', reports.length, 'records.');
  }
}

testConnection();

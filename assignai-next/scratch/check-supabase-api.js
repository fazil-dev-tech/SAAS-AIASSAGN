const dns = require('dns');
const originalLookup = dns.lookup;
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

dns.lookup = function(hostname, options, callback) {
  let actualCallback = callback;
  let actualOptions = options;
  if (typeof options === 'function') {
    actualCallback = options;
    actualOptions = {};
  }
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return originalLookup(hostname, actualOptions, actualCallback);
  }
  resolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      return originalLookup(hostname, actualOptions, actualCallback);
    }
    const ip = addresses[0];
    if (actualOptions.all) {
      return actualCallback(null, addresses.map(addr => ({ address: addr, family: 4 })));
    } else {
      return actualCallback(null, ip, 4);
    }
  });
};

const { createClient } = require('@supabase/supabase-js');
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
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase credentials not found in environment!');
  process.exit(1);
}

console.log('Connecting to Supabase API...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  const testEmail = 'db-check-test@example.com';
  
  try {
    console.log('1. Checking connection & RLS on "users" table...');
    
    // Test insert user
    const { data: insertUser, error: insertUserErr } = await supabase
      .from('users')
      .upsert({ email: testEmail, name: 'Database Check Bot' })
      .select();
      
    if (insertUserErr) throw new Error(`User insert failed: ${insertUserErr.message}`);
    console.log('✅ User Upsert: SUCCESS', insertUser);

    // Test insert report
    console.log('2. Testing insert on "reports" table...');
    const { data: insertReport, error: insertReportErr } = await supabase
      .from('reports')
      .insert({
        user_id: testEmail,
        assignment_title: 'DB Verification Test',
        subject: 'Database Check',
        html_content: '[]',
        word_count: 10
      })
      .select();

    if (insertReportErr) throw new Error(`Report insert failed: ${insertReportErr.message}`);
    console.log('✅ Report Insert: SUCCESS', insertReport);

    // Test select report
    console.log('3. Testing select on "reports" table...');
    const { data: selectReports, error: selectReportsErr } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', testEmail);

    if (selectReportsErr) throw new Error(`Reports select failed: ${selectReportsErr.message}`);
    console.log(`✅ Reports Select: SUCCESS (Found ${selectReports.length} records)`);

    // Clean up: delete test entries
    console.log('4. Cleaning up test entries...');
    const { error: deleteReportErr } = await supabase
      .from('reports')
      .delete()
      .eq('user_id', testEmail);
      
    if (deleteReportErr) throw new Error(`Report delete failed: ${deleteReportErr.message}`);
    
    const { error: deleteUserErr } = await supabase
      .from('users')
      .delete()
      .eq('email', testEmail);
      
    if (deleteUserErr) throw new Error(`User delete failed: ${deleteUserErr.message}`);
    
    console.log('✅ Cleanup: SUCCESS');
    console.log('\n=========================================');
    console.log('🎉 DATABASE CHECK PASSED SUCCESSFULLY!');
    console.log('=========================================');

  } catch (err) {
    console.error('\n❌ Database Check FAILED:', err.message);
    if (err.message.includes('row-level security policy')) {
      console.log('\n================================================================================');
      console.log('👉 HOW TO FIX RLS POLICY VIOLATIONS:');
      console.log('1. Open your Supabase Dashboard (https://supabase.com)');
      console.log('2. Navigate to the SQL Editor on the left sidebar.');
      console.log('3. Open the file: scratch/secure_db.sql in your editor.');
      console.log('4. Copy the entire contents of scratch/secure_db.sql.');
      console.log('5. Paste the SQL into the Supabase SQL Editor and click "Run".');
      console.log('6. Once executed, rerun this script to confirm RLS policies are applied!');
      console.log('================================================================================\n');
    }
  }
}

checkDatabase();

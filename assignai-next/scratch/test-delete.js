const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const getVal = (key) => {
  const match = env.match(new RegExp(`${key}\\s*=\\s*(.*)`));
  return match ? match[1].trim().replace(/['"]/g, '') : '';
};
const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
const key = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(url, key);

async function check() {
  console.log("Testing OTP Deletion RLS Policy...");
  
  // 1. Insert dummy OTP
  const { data: insertData, error: insertError } = await supabase
    .from('otps')
    .insert([{ 
      email: 'test-delete@example.com', 
      code: '123456', 
      expires_at: new Date(Date.now() + 10000).toISOString() 
    }])
    .select();
    
  if (insertError) {
    console.error("Insert failed:", insertError.message);
    return;
  }
  
  const otpId = insertData[0].id;
  console.log(`Inserted OTP with ID: ${otpId}`);
  
  // 2. Attempt to delete it
  const { data: deleteData, error: deleteError } = await supabase
    .from('otps')
    .delete()
    .eq('id', otpId)
    .select();
    
  if (deleteError) {
    console.error("Delete failed:", deleteError.message);
    return;
  }
  
  if (deleteData && deleteData.length > 0) {
    console.log("SUCCESS! Delete operation returned the deleted row, meaning RLS allowed it.");
  } else {
    console.log("FAILED! Delete operation returned 0 rows. RLS policy might be missing.");
  }
}

check();

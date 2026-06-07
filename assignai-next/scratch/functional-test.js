const fs = require('fs');
const path = require('path');

// Manually load environment variables from .env.local to read test config
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

const adminEmail = process.env.ADMIN_EMAIL || 'mohamedfazilpasha156@gmail.com';
const adminPass = process.env.ADMIN_PASS || 'TGVINCENZO';
const testUser = 'mohamedadilpasha@gmail.com';

async function verifyAll() {
  console.log('==================================================');
  console.log('       DETAILED FUNCTIONAL VERIFICATION SUITE     ');
  console.log('==================================================\n');

  // Check 1: Next.js dev server status
  try {
    const res = await fetch('http://localhost:3000/');
    console.log(`[1/7] Homepage Status: ✅ ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`[1/7] Homepage Status: ❌ FAILED - Dev server not running on port 3000!`);
    process.exit(1);
  }

  // Check 2: NVIDIA Text Generation API
  try {
    const res = await fetch('http://localhost:3000/api/nvidia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello, NVIDIA. Reply with "OK".' })
    });
    const data = await res.json();
    const isOk = res.ok && data.text;
    console.log(`[2/7] NVIDIA Text API: ${isOk ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`      Status: ${res.status} | Text: "${data.text?.trim() || data.error || 'No response'}"`);
  } catch (err) {
    console.error(`[2/7] NVIDIA Text API: ❌ ERROR - ${err.message}`);
  }

  // Check 3: NVIDIA Image Generation API (SDXL)
  try {
    console.log('      Generating image (this may take 3-5 seconds)...');
    const res = await fetch('http://localhost:3000/api/nvidia/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Technical flowchart sketch of a cell structure' })
    });
    const data = await res.json();
    const isOk = res.ok && data.base64 && data.base64.startsWith('data:image/');
    console.log(`[3/7] NVIDIA Image API: ${isOk ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`      Status: ${res.status} | Output: ${isOk ? `${data.base64.substring(0, 40)}... [Base64 Valid]` : (data.error || 'Empty')}`);
  } catch (err) {
    console.error(`[3/7] NVIDIA Image API: ❌ ERROR - ${err.message}`);
  }

  // Check 4: Send OTP API (OTP Generation & Dispatch flow)
  try {
    const res = await fetch('http://localhost:3000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser, type: 'signup' })
    });
    const data = await res.json();
    // 200 OK or 400 "Account already exists" both prove the endpoint triggers successfully
    const isOk = res.ok || (res.status === 400 && data.error && data.error.includes('already exists'));
    console.log(`[4/7] OTP Dispatch API: ${isOk ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`      Status: ${res.status} | Message: "${data.message || data.error || 'No message'}"`);
  } catch (err) {
    console.error(`[4/7] OTP Dispatch API: ❌ ERROR - ${err.message}`);
  }

  // Check 5: Reports API (Secure database fetch route)
  try {
    const res = await fetch(`http://localhost:3000/api/reports?email=${encodeURIComponent(testUser)}`);
    const data = await res.json();
    const isOk = res.ok && Array.isArray(data);
    console.log(`[5/7] Reports Fetch API: ${isOk ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`      Status: ${res.status} | Mapped Records: ${isOk ? data.length : 0}`);
  } catch (err) {
    console.error(`[5/7] Reports Fetch API: ❌ ERROR - ${err.message}`);
  }

  // Check 6: Admin Login API
  try {
    const res = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPass })
    });
    const data = await res.json();
    const isOk = res.ok && data.success;
    console.log(`[6/7] Admin Login API: ${isOk ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`      Status: ${res.status} | Message: "${data.message || data.error || 'No message'}"`);
  } catch (err) {
    console.error(`[6/7] Admin Login API: ❌ ERROR - ${err.message}`);
  }

  // Check 7: Admin Telemetry & Observability API
  try {
    const res = await fetch('http://localhost:3000/api/admin', {
      method: 'GET',
      headers: { 'Authorization': adminPass }
    });
    const data = await res.json();
    const isOk = res.ok && data.reports && data.users;
    console.log(`[7/7] Admin Telemetry API: ${isOk ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`      Status: ${res.status} | Users: ${isOk ? data.users.length : 0} | Reports: ${isOk ? data.reports.length : 0}`);
  } catch (err) {
    console.error(`[7/7] Admin Telemetry API: ❌ ERROR - ${err.message}`);
  }

  console.log('\n==================================================');
  console.log('          VERIFICATION PROCESS COMPLETE           ');
  console.log('==================================================');
}

verifyAll();

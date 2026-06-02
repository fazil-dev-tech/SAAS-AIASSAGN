const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// 1. Load Environment Variables manually from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// 2. Configuration Requirements
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST be the service_role key, not anon key

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS?.replace(/"/g, ''); 

// Safety Check
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!SMTP_USER || !SMTP_PASS) {
  console.error('❌ ERROR: Missing SMTP_USER or SMTP_PASS in .env.local');
  process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true, 
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function main() {
  try {
    console.log('🔄 Fetching users from database...');
    
    // Fetch unique user emails from the reports table
    const { data: reports, error } = await supabase
      .from('reports')
      .select('user_id');

    if (error) throw error;

    // Extract unique emails
    const emails = [...new Set(reports.map(r => r.user_id).filter(email => email && email.includes('@')))];
    
    console.log(`✅ Found ${emails.length} unique users to broadcast to.`);

    if (emails.length === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    // Load the HTML Template
    const templatePath = path.join(__dirname, 'email_templates', 'update_announcement.html');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

    console.log('🚀 Starting broadcast...');
    let successCount = 0;
    let failCount = 0;

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"AssignAI Updates" <${SMTP_USER}>`,
          to: email,
          subject: '🚀 AssignAI 2.0 is Live! Major Academic Upgrade',
          html: htmlTemplate
        });
        console.log(`  ✉️ Sent to ${email}`);
        successCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`  ❌ Failed to send to ${email}:`, err.message);
        failCount++;
      }
    }

    console.log('\n✅ Broadcast Complete!');
    console.log(`Total Sent: ${successCount}`);
    console.log(`Total Failed: ${failCount}`);

  } catch (err) {
    console.error('❌ Critical Error during broadcast:', err);
  }
}

main();
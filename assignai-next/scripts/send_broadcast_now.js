const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Credentials from .env.local
const SMTP_USER = 'mohamedfazilpasha156@gmail.com';
const SMTP_PASS = 'thfp kpts isxr labk';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function main() {
  const templatePath = path.join(__dirname, 'email_templates/update_announcement.html');
  const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

  // Hardcoded emails extracted via Supabase MCP Execute SQL
  const emails = ["mohamedfazilpasha156@gmail.com"];

  console.log(`Sending to ${emails.length} users...`);

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"Team Admin AssignAI" <${SMTP_USER}>`,
        to: email,
        subject: '🚀 AssignAI System Update: Perfect Reports are Here!',
        html: htmlTemplate,
      });
      console.log(`✅ Successfully sent to: ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${email}:`, err.message);
    }
  }
}

main();
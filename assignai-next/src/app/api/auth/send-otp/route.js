import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import rateLimit from '@/utils/rateLimit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request) {
  try {
    try {
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      await limiter.check(NextResponse, 50, ip); // HIGH limit: 50 OTPs per minute
    } catch {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { email, type } = await request.json(); // type: 'login' | 'signup'

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Attempt to check users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('email, is_suspended')
      .eq('email', email)
      .single();
    
    // Ignore error if table doesn't exist, but enforce logic if it does
    if (!userError || userError.code === 'PGRST116') { // PGRST116 is not found
      if (type === 'signup' && existingUser) {
        return NextResponse.json({ error: "Account already exists. Please sign in." }, { status: 400 });
      }
      if (type === 'login' && !existingUser) {
        return NextResponse.json({ error: "Account not found. Please create an account first." }, { status: 404 });
      }
      // Block suspended users from logging in
      if (existingUser && existingUser.is_suspended) {
        return NextResponse.json({ error: "Your account has been suspended. Please contact the administrator." }, { status: 403 });
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiration (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save to database
    const { error: dbError } = await supabase
      .from('otps')
      .insert([
        { email, code, expires_at: expiresAt.toISOString() }
      ]);

    if (dbError) {
      console.error("DB Error:", dbError);
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
    }

    // Send Email using Custom SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/"/g, '') // remove quotes if any
      }
    });

    const mailOptions = {
      from: `"AssignAI Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your AssignAI Secure Login Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
            
            body, table, td, p, a, h1, h2, h3 {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }

            @keyframes pulseGlow {
              0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
              70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
              100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }

            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .animated-box {
              animation: slideUp 0.8s ease-out forwards;
            }

            .pulse-container {
              animation: pulseGlow 2s infinite;
            }

            @media screen and (max-width: 600px) {
              .email-container { width: 100% !important; border-radius: 0 !important; }
              .header-padding { padding: 30px 15px !important; }
              .content-padding { padding: 30px 15px !important; }
              .title-text { font-size: 26px !important; }
              .otp-text { font-size: 38px !important; letter-spacing: 6px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; -webkit-font-smoothing: antialiased;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container animated-box" style="max-width: 600px; background-color: #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #334155;">
                  
                  <!-- Header with Glassmorphism Vibe -->
                  <tr>
                    <td class="header-padding" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 50px 30px; text-align: center; position: relative;">
                      <h1 class="title-text" style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase;">AssignAI</h1>
                      <div style="margin: 15px 0 20px 0;">
                        <span style="background-color: #f59e0b; background: linear-gradient(90deg, #fcd34d, #f59e0b); color: #0f172a; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);">Premium AI Engine</span>
                      </div>
                      <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 600;">Your Ultimate Assignment Assistant</p>
                      
                      <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.3);">
                        <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.9); font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Officially Signed & Secured By</p>
                        <div style="display: inline-block; background-color: #fbbf24; background: linear-gradient(90deg, #fcd34d, #fbbf24); color: #0f172a; padding: 10px 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(251, 191, 36, 0.3);">
                          <span style="display: block; font-size: 18px; font-weight: 900; letter-spacing: 2px; margin-bottom: 4px;">MOHAMED FAZIL PASHA</span>
                          <span style="display: block; font-size: 12px; font-weight: 700; color: #1e293b; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">Founder & Lead Engineer, AssignAI</span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td class="content-padding" style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #f8fafc; font-size: 24px; font-weight: 800;">Secure Login Request</h2>
                      <p style="margin: 0 0 35px 0; color: #cbd5e1; font-size: 16px; line-height: 1.7;">
                        Hello there,<br><br>
                        We received a request to access your AssignAI Dashboard. Please use the secure One-Time Passcode (OTP) below to authenticate your highly secure session.
                      </p>

                      <!-- Animated OTP Box -->
                      <div class="pulse-container" style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 2px solid #10b981; border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 35px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15);">
                        <span style="display: block; font-size: 14px; color: #10b981; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; margin-bottom: 15px;">Your Access Code</span>
                        <h1 class="otp-text" style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 900; letter-spacing: 12px; font-family: monospace;">${code}</h1>
                      </div>

                      <p style="margin: 0 0 40px 0; color: #94a3b8; font-size: 15px; line-height: 1.6; text-align: center; padding: 15px; background-color: rgba(239, 68, 68, 0.05); border-radius: 8px; border-left: 4px solid #ef4444;">
                        <strong style="color: #ef4444;">Security Notice:</strong> This code will expire in 10 minutes. If you did not request this, please ignore and delete this email.
                      </p>

                      <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;" />
                      
                      <!-- Footer -->
                      <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                        <strong>AssignAI Premium SaaS</strong><br>
                        Automating academic success with Artificial Intelligence.<br>
                        <br>
                        <a href="#" style="color: #10b981; text-decoration: none; font-weight: 600;">Help & Support</a> &nbsp;&bull;&nbsp; <a href="#" style="color: #10b981; text-decoration: none; font-weight: 600;">Privacy Policy</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("OTP Error:", error);
    return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
  }
}

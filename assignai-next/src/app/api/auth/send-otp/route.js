import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
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
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/"/g, '') // remove quotes if any
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
            @media screen and (max-width: 600px) {
              .email-container { width: 100% !important; border-radius: 0 !important; box-shadow: none !important; }
              .header-padding { padding: 30px 15px !important; }
              .content-padding { padding: 30px 15px !important; }
              .title-text { font-size: 24px !important; }
              .otp-text { font-size: 36px !important; letter-spacing: 4px !important; }
              .wrapper-padding { padding: 0 !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f6; padding: 40px 20px;" class="wrapper-padding">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td class="header-padding" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <h1 class="title-text" style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">AssignAI</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px;">Your AI-Powered Assignment Assistant</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td class="content-padding" style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: 700;">Secure Login Request</h2>
                      <p style="margin: 0 0 25px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Hello there,<br><br>
                        We received a request to access your AssignAI Dashboard. Please use the secure One-Time Passcode (OTP) below to authenticate your session.
                      </p>

                      <!-- OTP Box -->
                      <div style="background: linear-gradient(to right, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
                        <span style="display: block; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px;">Your Access Code</span>
                        <h1 class="otp-text" style="margin: 0; color: #0f172a; font-size: 42px; font-weight: 800; letter-spacing: 8px; font-family: monospace;">${code}</h1>
                      </div>

                      <p style="margin: 0 0 30px 0; color: #64748b; font-size: 14px; line-height: 1.5; text-align: center;">
                        <strong style="color: #ef4444;">Security Notice:</strong> This code will expire in 10 minutes. If you did not request this, please ignore and delete this email.
                      </p>

                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                      
                      <!-- Footer -->
                      <p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.5;">
                        <strong>AssignAI Premium SaaS</strong><br>
                        Automating academic success with Artificial Intelligence.<br>
                        <br>
                        <a href="#" style="color: #10b981; text-decoration: none;">Help & Support</a> &bull; <a href="#" style="color: #10b981; text-decoration: none;">Privacy Policy</a>
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

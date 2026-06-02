import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { to, subject, text, pdfBase64, filename } = await request.json();

    if (!to || !pdfBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Configure Nodemailer securely on the backend
    // In production, use process.env.SMTP_USER and process.env.SMTP_PASS
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'mohamedfazilpasha156@gmail.com',
        pass: process.env.SMTP_PASS?.replace(/"/g, '') || 'hknw ipix ynwa unjj',
      },
    });

    // Strip the "data:application/pdf;base64," prefix if it exists
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const mailOptions = {
      from: process.env.SMTP_USER || 'mohamedfazilpasha156@gmail.com',
      to: to,
      subject: subject || 'Your Generated Assignment Report',
      text: text || 'Please find your generated report attached.',
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

            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .animated-box {
              animation: slideUp 0.8s ease-out forwards;
            }

            @media screen and (max-width: 600px) {
              .email-container { width: 100% !important; border-radius: 0 !important; }
              .header-padding { padding: 30px 15px !important; }
              .content-padding { padding: 30px 15px !important; }
              .title-text { font-size: 26px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; -webkit-font-smoothing: antialiased;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container animated-box" style="max-width: 600px; background-color: #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #334155;">
                  
                  <!-- Header -->
                  <tr>
                    <td class="header-padding" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 50px 30px; text-align: center; position: relative;">
                      <h1 class="title-text" style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">AssignAI</h1>
                      <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px; font-weight: 600;">Your AI-Powered Assignment Assistant</p>

                      <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.3);">
                        <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.85); font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Proudly Architected & Engineered by</p>
                        <span style="background: linear-gradient(90deg, #fcd34d, #fbbf24); color: #0f172a; padding: 6px 16px; border-radius: 8px; font-size: 16px; font-weight: 900; letter-spacing: 2px; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4); display: inline-block;">MOHAMED FAZIL PASHA</span>
                      </div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td class="content-padding" style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #f8fafc; font-size: 24px; font-weight: 800;">Report Successfully Generated!</h2>
                      <p style="margin: 0 0 25px 0; color: #cbd5e1; font-size: 16px; line-height: 1.7;">
                        ${text || 'Please find your meticulously formatted, university-grade academic report attached as a PDF.'}
                      </p>
                      
                      <!-- Info Box -->
                      <div style="background-color: #0f172a; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 35px; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #f8fafc; font-size: 15px; line-height: 1.6;">
                          <strong style="color: #10b981;">✓ High-Quality PDF Output</strong><br>
                          Your report has been paginated and styled using our advanced rendering engine.
                        </p>
                      </div>

                      <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;" />

                      <!-- Footer -->
                      <div style="text-align: center;">
                        <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                          <strong>AssignAI Premium SaaS</strong><br>
                          Automating academic success with Artificial Intelligence.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: filename || 'Report.pdf',
          content: base64Data,
          encoding: 'base64',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent securely!" }, { status: 200 });

  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { to, subject, text, pdfBase64, filename } = await request.json();

    if (!to || !pdfBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Configure Nodemailer securely on the backend
    // In production, use process.env.EMAIL_USER and process.env.EMAIL_PASS
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'mohamedfazilpasha156@gmail.com',
        pass: process.env.EMAIL_PASS || 'hknw ipix ynwa unjj',
      },
    });

    // Strip the "data:application/pdf;base64," prefix if it exists
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const mailOptions = {
      from: process.env.EMAIL_USER || 'mohamedfazilpasha156@gmail.com',
      to: to,
      subject: subject || 'Your Generated Assignment Report',
      text: text || 'Please find your generated report attached.',
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

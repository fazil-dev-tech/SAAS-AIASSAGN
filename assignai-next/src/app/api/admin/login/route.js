import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL || 'mohamedfazilpasha156@gmail.com';
    const adminPass = process.env.ADMIN_PASS || 'TGVINCENZO';

    if (
      email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
      password === adminPass
    ) {
      return NextResponse.json({ success: true, message: 'Authenticated successfully' });
    } else {
      return NextResponse.json({ error: 'Access Denied: Invalid Credentials' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error during authentication' }, { status: 500 });
  }
}

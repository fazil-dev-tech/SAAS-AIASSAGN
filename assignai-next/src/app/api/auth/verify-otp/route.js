import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
  try {
    const { email, code, name, type } = await request.json(); // type: 'login' | 'signup'

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    // Find the latest valid OTP for this email
    const { data: otps, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !otps || otps.length === 0) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // OTP is valid! Delete it so it can't be reused
    await supabase.from('otps').delete().eq('id', otps[0].id);

    let fullName = email.split('@')[0];

    if (type === 'signup') {
      // Try to insert user
      const { error: insertError } = await supabase.from('users').insert([{ email, name: name || fullName }]);
      if (insertError) {
        console.error("Failed to insert user:", insertError);
        // If the table doesn't exist, we'll gracefully continue for now, but in production this should fail
      } else {
        fullName = name || fullName;
      }
    } else {
      // Try to fetch existing user
      const { data: existingUser, error: fetchError } = await supabase.from('users').select('name').eq('email', email).single();
      if (!fetchError && existingUser && existingUser.name) {
        fullName = existingUser.name;
      }
    }

    // Return the custom user object
    // We use the email as the user's unique ID for the reports table
    const user = {
      id: email, // Using email as the primary ID
      email: email,
      user_metadata: {
        full_name: fullName
      }
    };

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("OTP Verify Error:", error);
    return NextResponse.json({ error: "Server error during verification" }, { status: 500 });
  }
}

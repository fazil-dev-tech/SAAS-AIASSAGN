import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimit from '@/utils/rateLimit';
import { z } from 'zod';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
  name: z.string().optional(),
  type: z.enum(['login', 'signup']).optional()
});

export async function POST(request) {
  try {
    try {
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      await limiter.check(NextResponse, 100, ip); // HIGH limit: 100 OTP verifications per minute
    } catch {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawBody = await request.json();
    const parsed = verifyOtpSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const { email, code, name, type } = parsed.data; // type: 'login' | 'signup'


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

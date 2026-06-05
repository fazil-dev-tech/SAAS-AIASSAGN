import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase client — uses anon key (service role key is optional for elevated access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request) {
  try {
    const { userId, title, subject, htmlContent, wordCount } = await request.json();

    if (!userId || !title || !htmlContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert into the 'reports' table we created via MCP
    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          user_id: userId,
          assignment_title: title,
          subject: subject,
          html_content: htmlContent,
          word_count: wordCount || 0
        }
      ]);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Report permanently archived!" }, { status: 200 });

  } catch (error) {
    console.error("Database Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

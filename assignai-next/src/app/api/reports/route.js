import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimit from '@/utils/rateLimit';
import { z } from 'zod';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 users per minute
});

// Setup Supabase client — uses anon key (service role key is optional for elevated access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const reportSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  htmlContent: z.string().min(1, "HTML content is required"),
  wordCount: z.number().optional()
});

export async function POST(request) {
  try {
    try {
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      await limiter.check(NextResponse, 100, ip); // HIGH limit: 100 requests per minute per IP
    } catch {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawBody = await request.json();
    const parsed = reportSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const { userId, title, subject, htmlContent, wordCount } = parsed.data;

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

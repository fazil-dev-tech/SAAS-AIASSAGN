import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization');
  const adminPass = process.env.ADMIN_PASS || 'TGVINCENZO';
  return authHeader === adminPass;
}

export async function GET(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const [resReports, resUsers] = await Promise.all([
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*')
    ]);

    if (resReports.error) throw resReports.error;
    if (resUsers.error) throw resUsers.error;

    return NextResponse.json({
      reports: resReports.data || [],
      users: resUsers.data || []
    });
  } catch (error) {
    console.error('Admin API GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, email, isSuspended, reportId } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'suspend') {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: isSuspended })
        .eq('email', email);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `User status updated` });
    }

    if (action === 'delete-user') {
      // Cascade delete reports manually
      await supabase.from('reports').delete().eq('user_id', email);
      const { error } = await supabase.from('users').delete().eq('email', email);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'User permanently deleted' });
    }

    if (action === 'delete-report') {
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Report deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin API POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/db';

/**
 * GET /api/phone-assistant/calls
 * Fetch call logs for the user with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status'); // completed, missed, voicemail
    const actionNeeded = searchParams.get('action_needed'); // true/false
    const dateFilter = searchParams.get('date'); // today, week, month

    // Build query
    let query = supabase
      .from('call_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('call_status', status);
    }

    if (actionNeeded === 'true') {
      query = query.not('action_needed', 'is', null);
    }

    if (dateFilter) {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: calls, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      calls: calls || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call logs' },
      { status: 500 }
    );
  }
}

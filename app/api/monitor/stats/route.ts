// app/api/monitor/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

const MONITOR_KEY = 'bmai-monitor-2026'

export async function GET(req: NextRequest) {
  // Auth guard
  const key = req.headers.get('X-Monitor-Key')
  if (key !== MONITOR_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ── Users ────────────────────────────────────────────────────────────────
    const { count: usersTotal } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: usersNewToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString())

    const { count: usersNewThisWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: usersNewLastHour } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo.toISOString())

    // ── Estimates ────────────────────────────────────────────────────────────
    const { count: estimatesTotal } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })

    const { count: estimatesToday } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString())

    const { count: estimatesThisWeek } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    // ── Subscriptions ────────────────────────────────────────────────────────
    const { data: subData } = await supabase
      .from('users')
      .select('subscription_tier')

    const subscriptions = { free: 0, pro: 0, team: 0 }
    for (const row of subData || []) {
      const tier = (row.subscription_tier || 'free').toLowerCase()
      if (tier === 'pro') subscriptions.pro++
      else if (tier === 'team') subscriptions.team++
      else subscriptions.free++
    }

    return NextResponse.json({
      timestamp: now.toISOString(),
      users: {
        total: usersTotal ?? 0,
        new_today: usersNewToday ?? 0,
        new_this_week: usersNewThisWeek ?? 0,
        new_last_hour: usersNewLastHour ?? 0,
      },
      estimates: {
        total: estimatesTotal ?? 0,
        today: estimatesToday ?? 0,
        this_week: estimatesThisWeek ?? 0,
      },
      subscriptions,
      site_health: 'ok',
    })
  } catch (error: any) {
    console.error('Monitor stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats', site_health: 'error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const { data: estimates, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({ estimates })
  } catch (error: any) {
    console.error('Error fetching estimates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch estimates' },
      { status: 500 }
    )
  }
}

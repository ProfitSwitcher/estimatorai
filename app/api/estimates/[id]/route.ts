// app/api/estimates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', (session.user as any).id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ estimate: data })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { lineItems, projectTitle, status } = body

  // Recalculate totals if line items changed
  let updates: any = {}
  if (projectTitle) updates.project_title = projectTitle
  if (status) updates.status = status
  if (lineItems) {
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.total, 0)
    // Assuming a static tax rate for now, could be dynamic
    const tax = subtotal * 0.08 
    updates.line_items = lineItems
    updates.subtotal = subtotal
    updates.tax = tax
    updates.total = subtotal + tax
  }

  const { error } = await supabase
    .from('estimates')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', (session.user as any).id)

  if (error) {
    console.error(`Error updating estimate \${params.id}:`, error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('estimates')
    .delete()
    .eq('id', params.id)
    .eq('user_id', (session.user as any).id)

  if (error) {
    console.error(`Error deleting estimate \${params.id}:`, error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

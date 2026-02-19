// app/api/estimates/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { generateEstimatePDF } from '@/lib/services/pdfService'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: estimate, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', (session.user as any).id)
    .single()

  if (error || !estimate) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Ensure line_items is properly parsed if it's stored as a JSON string
  if (typeof estimate.line_items === 'string') {
    try {
      estimate.line_items = JSON.parse(estimate.line_items)
    } catch (parseError) {
      console.error('Failed to parse line_items JSON:', parseError);
      // Handle error appropriately, perhaps return an error response
      return NextResponse.json({ error: 'Failed to parse estimate data' }, { status: 500 });
    }
  }

  const pdfBuffer = await generateEstimatePDF(estimate)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="\${estimate.project_title}-estimate.pdf"`,
    },
  })
}

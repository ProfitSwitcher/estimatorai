// app/api/company-profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// GET - Fetch company profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const { data: profile, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return NextResponse.json({ profile: null }, { status: 200 })
      }
      console.error('Error fetching company profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/company-profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create company profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    // Validate required fields
    if (!body.company_name || !body.trade || body.trade.length === 0) {
      return NextResponse.json(
        { error: 'Company name and at least one trade are required' },
        { status: 400 }
      )
    }

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Company profile already exists. Use PUT to update.' },
        { status: 409 }
      )
    }

    // Create profile
    const { data: profile, error } = await supabase
      .from('company_profiles')
      .insert({
        user_id: userId,
        company_name: body.company_name,
        trade: body.trade,
        service_area_city: body.service_area_city || null,
        service_area_state: body.service_area_state || null,
        service_area_zip: body.service_area_zip || null,
        labor_rates: body.labor_rates || {},
        material_markup_pct: body.material_markup_pct || 25.0,
        overhead_profit_pct: body.overhead_profit_pct || 15.0,
        tax_rate: body.tax_rate || 0.08,
        license_number: body.license_number || null,
        bond_number: body.bond_number || null,
        common_job_types: body.common_job_types || [],
        preferred_suppliers: body.preferred_suppliers || [],
        min_job_size: body.min_job_size || null,
        service_call_fee: body.service_call_fee || null,
        typical_crew_sizes: body.typical_crew_sizes || {},
        equipment_owned: body.equipment_owned || [],
        payment_terms: body.payment_terms || null,
        additional_notes: body.additional_notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating company profile:', error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/company-profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update company profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    // Update profile
    const { data: profile, error } = await supabase
      .from('company_profiles')
      .update({
        company_name: body.company_name,
        trade: body.trade,
        service_area_city: body.service_area_city,
        service_area_state: body.service_area_state,
        service_area_zip: body.service_area_zip,
        labor_rates: body.labor_rates,
        material_markup_pct: body.material_markup_pct,
        overhead_profit_pct: body.overhead_profit_pct,
        tax_rate: body.tax_rate,
        license_number: body.license_number,
        bond_number: body.bond_number,
        common_job_types: body.common_job_types,
        preferred_suppliers: body.preferred_suppliers,
        min_job_size: body.min_job_size,
        service_call_fee: body.service_call_fee,
        typical_crew_sizes: body.typical_crew_sizes,
        equipment_owned: body.equipment_owned,
        payment_terms: body.payment_terms,
        additional_notes: body.additional_notes,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating company profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('Error in PUT /api/company-profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

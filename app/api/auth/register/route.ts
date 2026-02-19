// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: name || email.split('@')[0],
        email,
        password_hash,
        subscription_tier: 'free',
      })
      .select('id, name, email')
      .single()

    if (error) {
      console.error('Registration error:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Account created successfully', user }, { status: 201 })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

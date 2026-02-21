import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
  createAssistant,
  updateAssistant,
  deleteAssistant,
  buyPhoneNumber,
  releasePhoneNumber
} from '@/lib/services/vapiService';

/**
 * GET /api/phone-assistant
 * Fetch the user's phone assistant configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const { data: phoneAssistant, error } = await supabase
      .from('phone_assistants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return NextResponse.json({ phoneAssistant: phoneAssistant || null });
  } catch (error: any) {
    console.error('Error fetching phone assistant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone assistant' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/phone-assistant
 * Create a new phone assistant (creates VAPI assistant + buys phone number)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Fetch company profile
    const { data: companyProfile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !companyProfile) {
      return NextResponse.json(
        { error: 'Company profile not found. Complete onboarding first.' },
        { status: 400 }
      );
    }

    // Create VAPI assistant
    const { assistantId } = await createAssistant(companyProfile, body);

    // Buy phone number
    const { phoneNumberId, phoneNumber } = await buyPhoneNumber(
      assistantId,
      body.areaCode
    );

    // Save to database
    const { data: phoneAssistant, error: insertError } = await supabase
      .from('phone_assistants')
      .insert({
        user_id: userId,
        vapi_assistant_id: assistantId,
        vapi_phone_number_id: phoneNumberId,
        phone_number: phoneNumber,
        assistant_name: body.assistant_name,
        greeting_message: body.greeting_message,
        business_hours: body.business_hours,
        after_hours_message: body.after_hours_message,
        services_offered: body.services_offered,
        service_area: body.service_area,
        emergency_instructions: body.emergency_instructions,
        transfer_number: body.transfer_number,
        voicemail_email: body.voicemail_email,
        voice_id: body.voice_id || 'alloy',
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: delete VAPI resources
      try {
        await deleteAssistant(assistantId);
        await releasePhoneNumber(phoneNumberId);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      phoneAssistant
    });
  } catch (error: any) {
    console.error('Error creating phone assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create phone assistant' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/phone-assistant
 * Update phone assistant settings (updates VAPI assistant)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Fetch existing phone assistant
    const { data: existingAssistant, error: fetchError } = await supabase
      .from('phone_assistants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAssistant) {
      return NextResponse.json(
        { error: 'Phone assistant not found' },
        { status: 404 }
      );
    }

    // Fetch company profile
    const { data: companyProfile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !companyProfile) {
      return NextResponse.json(
        { error: 'Company profile not found' },
        { status: 400 }
      );
    }

    // Update VAPI assistant
    await updateAssistant(
      existingAssistant.vapi_assistant_id,
      companyProfile,
      body
    );

    // Update database
    const { data: updatedAssistant, error: updateError } = await supabase
      .from('phone_assistants')
      .update({
        assistant_name: body.assistant_name,
        greeting_message: body.greeting_message,
        business_hours: body.business_hours,
        after_hours_message: body.after_hours_message,
        services_offered: body.services_offered,
        service_area: body.service_area,
        emergency_instructions: body.emergency_instructions,
        transfer_number: body.transfer_number,
        voicemail_email: body.voicemail_email,
        voice_id: body.voice_id,
        is_active: body.is_active !== undefined ? body.is_active : existingAssistant.is_active
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      phoneAssistant: updatedAssistant
    });
  } catch (error: any) {
    console.error('Error updating phone assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update phone assistant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/phone-assistant
 * Delete phone assistant (releases phone number and deletes VAPI assistant)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch existing phone assistant
    const { data: existingAssistant, error: fetchError } = await supabase
      .from('phone_assistants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAssistant) {
      return NextResponse.json(
        { error: 'Phone assistant not found' },
        { status: 404 }
      );
    }

    // Delete VAPI resources
    try {
      await deleteAssistant(existingAssistant.vapi_assistant_id);
      await releasePhoneNumber(existingAssistant.vapi_phone_number_id);
    } catch (vapiError) {
      console.error('Error deleting VAPI resources:', vapiError);
      // Continue with database deletion even if VAPI fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('phone_assistants')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting phone assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete phone assistant' },
      { status: 500 }
    );
  }
}

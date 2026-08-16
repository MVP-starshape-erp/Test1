'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function sendOTP(formData: FormData) {
  const email = formData.get('email') as string | null
  const phone = formData.get('phone') as string | null
  
  if (!email && !phone) {
    throw new Error('Email or phone number is required')
  }

  const supabase = await createClient()

  let error;
  let sessionId = null;

  if (email) {
    if (!email.includes('@')) throw new Error('Invalid email address')
    const res = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    error = res.error
  } else if (phone) {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    if (!apiKey) {
      throw new Error('2factor API key is not configured');
    }

    try {
      const url = `https://2factor.in/API/V1/${apiKey}/SMS/${encodeURIComponent(phone)}/AUTOGEN`;
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();
      
      if (data.Status === 'Success') {
        sessionId = data.Details;
      } else {
        error = { message: data.Details || 'Failed to send OTP via 2factor.in' };
      }
    } catch (err: any) {
      error = { message: err.message || 'Error communicating with 2factor API' };
    }
  }

  if (error) {
    if (error.status === 429) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error(error.message)
  }

  // Redirect to verification page
  let query = email ? `email=${encodeURIComponent(email)}` : `phone=${encodeURIComponent(phone!)}`;
  if (sessionId) {
    query += `&sessionId=${encodeURIComponent(sessionId)}`;
  }
  redirect(`/verify?${query}`)
}

export async function verifyOTP(formData: FormData) {
  const email = formData.get('email') as string | null
  const phone = formData.get('phone') as string | null
  const token = formData.get('token') as string
  const sessionId = formData.get('sessionId') as string | null

  if (!token || token.length !== 6) {
    throw new Error('Invalid OTP format')
  }
  if (!email && !phone) {
    throw new Error('Email or phone is required')
  }

  const supabase = await createClient()

  if (email) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      throw new Error(error.message)
    }
  } else if (phone) {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    if (!apiKey) {
      throw new Error('2factor API key is not configured');
    }

    if (!sessionId) {
      throw new Error('Session ID is missing for phone verification');
    }

    try {
      const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${token}`;
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();
      
      if (data.Status !== 'Success') {
        throw new Error(data.Details || 'Invalid OTP');
      }
      
      // Successfully verified phone OTP with 2factor.in
      // We are skipping Supabase session creation for now as per user request.
      // You would normally create a custom JWT and log the user into Supabase here if needed.
    } catch (err: any) {
      throw new Error(err.message || 'Error verifying OTP with 2factor API');
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

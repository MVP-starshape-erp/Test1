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
  if (email) {
    if (!email.includes('@')) throw new Error('Invalid email address')
    const res = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    error = res.error
  } else if (phone) {
    const res = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    })
    error = res.error
  }

  if (error) {
    if (error.status === 429) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error(error.message)
  }

  // Redirect to verification page
  const query = email ? `email=${encodeURIComponent(email)}` : `phone=${encodeURIComponent(phone!)}`
  redirect(`/verify?${query}`)
}

export async function verifyOTP(formData: FormData) {
  const email = formData.get('email') as string | null
  const phone = formData.get('phone') as string | null
  const token = formData.get('token') as string

  if (!token || token.length !== 6) {
    throw new Error('Invalid OTP format')
  }
  if (!email && !phone) {
    throw new Error('Email or phone is required')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp(
    email 
      ? { email, token, type: 'email' }
      : { phone: phone!, token, type: 'sms' }
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

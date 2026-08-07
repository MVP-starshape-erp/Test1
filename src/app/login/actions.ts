'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function sendOTP(formData: FormData) {
  const email = formData.get('email') as string
  
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address')
  }

  const supabase = await createClient()

  // Ensure this sends an OTP and does NOT use password authentication
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // Creates user if they don't exist
    },
  })

  if (error) {
    if (error.status === 429) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error(error.message)
  }

  // Redirect to verification page with email as parameter to show the user
  redirect(`/verify?email=${encodeURIComponent(email)}`)
}

export async function verifyOTP(formData: FormData) {
  const email = formData.get('email') as string
  const token = formData.get('token') as string

  if (!email || !token || token.length !== 6) {
    throw new Error('Invalid email or OTP format')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email', // Validates email OTP
  })

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

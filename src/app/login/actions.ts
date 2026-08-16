'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient as createStatelessClient } from '@supabase/supabase-js'

import * as argon2 from 'argon2'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  // 0. Fetch the user's custom salt and password hash using Admin Client
  const adminClient = createAdminClient()
  const { data: securityData, error: securityError } = await adminClient
    .from('user_security')
    .select('custom_salt, password_hash, user_id')
    .eq('email', email)
    .single()

  if (securityError || !securityData) {
    throw new Error('Invalid email or password (Security profile not found)')
  }

  // 1. Combine and Verify Hash
  const combinedPassword = password + securityData.custom_salt
  
  const isMatch = await argon2.verify(securityData.password_hash, combinedPassword)
  if (!isMatch) {
    throw new Error('Invalid email or password')
  }

  // Get the user data from Supabase Admin since we bypassed the standard login
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(securityData.user_id)
  if (userError || !userData.user) {
    throw new Error('User not found in authentication system')
  }

  const userId = userData.user.id
  const authData = userData

  // 2. Fetch the user's role using Admin Client
  const { data: roleData, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (roleError || !roleData) {
    throw new Error('User role is not defined. Please contact support.')
  }

  const role = roleData.role

  let sessionId = null;
  let phone = null;

  // 3. Trigger OTP based on role
  if (role === 'owner') {
    // Send Email OTP using the admin client so it doesn't log the user in yet
    const { error: otpError } = await adminClient.auth.signInWithOtp({ email })
    if (otpError) throw new Error('Failed to send Email OTP')
  } else if (role === 'admin') {
    phone = authData.user.phone
    if (!phone) {
      throw new Error('Admin user has no phone number registered.')
    }
    
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    if (!apiKey) throw new Error('2factor API key is not configured');

    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${encodeURIComponent(phone)}/AUTOGEN`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    
    if (data.Status === 'Success') {
      sessionId = data.Details;
    } else {
      throw new Error(data.Details || 'Failed to send OTP via 2factor.in');
    }
  } else {
    throw new Error('Invalid role')
  }

  // 4. Redirect to verify page
  let query = `email=${encodeURIComponent(email)}&role=${role}`
  if (phone) query += `&phone=${encodeURIComponent(phone)}`
  if (sessionId) query += `&sessionId=${encodeURIComponent(sessionId)}`
  
  redirect(`/verify?${query}`)
}

export async function verifyOTP(formData: FormData) {
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const phone = formData.get('phone') as string | null
  const token = formData.get('token') as string
  const sessionId = formData.get('sessionId') as string | null

  if (!token || token.length !== 6) {
    throw new Error('Invalid OTP format')
  }

  // Use the standard server client so it sets cookies upon success
  const supabase = await createClient()

  if (role === 'owner') {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw new Error(error.message)
  } else if (role === 'admin') {
    if (!phone || !sessionId) throw new Error('Missing phone or session ID')
    
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${token}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    
    if (data.Status !== 'Success') {
      throw new Error(data.Details || 'Invalid OTP');
    }
    
    // SMS OTP Verified. Now establish Supabase Session.
    const adminClient = createAdminClient()
    
    // Generate a secure random password
    const crypto = require('crypto')
    const tempPassword = crypto.randomBytes(32).toString('hex')
    
    // Find the user by phone (or email)
    const { data: users, error: findError } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)
    
    if (!user) throw new Error('User not found')

    // Update their password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, { password: tempPassword })
    if (updateError) throw new Error('Failed to prepare session')

    // Sign in with the temporary password using the standard client to get cookies
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: tempPassword })
    if (signInError) throw new Error('Failed to establish session')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

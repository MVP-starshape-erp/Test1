'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import * as argon2 from 'argon2'
import crypto from 'crypto'

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const phone = formData.get('phone') as string
  const role = formData.get('role') as string
  
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  if (role === 'admin' && !phone) {
    throw new Error('Phone number is required for Admins')
  }

  const adminClient = createAdminClient()

  // 1. Generate 6-char random alphanumeric salt
  const saltLength = 6
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let customSalt = ''
  for (let i = 0; i < saltLength; i++) {
    const randomByte = crypto.randomBytes(1)[0]
    customSalt += charset[randomByte % charset.length]
  }

  // 2. Hash password + customSalt using argon2id
  const combinedPassword = password + customSalt
  const argon2Hash = await argon2.hash(combinedPassword, {
    type: argon2.argon2id
  })

  // 3. Create User in Supabase Auth (using a random dummy password, since we handle authentication manually)
  const dummyPassword = crypto.randomBytes(32).toString('hex')
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: dummyPassword,
    phone: phone || undefined,
    email_confirm: true,
    phone_confirm: true
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create user')
  }

  const userId = authData.user.id

  // 4. Save custom salt and password hash in user_security
  const { error: securityError } = await adminClient
    .from('user_security')
    .insert({ user_id: userId, email, custom_salt: customSalt, password_hash: argon2Hash })

  if (securityError) {
    // Cleanup on failure
    await adminClient.auth.admin.deleteUser(userId)
    throw new Error('Failed to save security configuration. ' + securityError.message)
  }

  // 5. Save role
  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({ user_id: userId, role })

  if (roleError) {
    throw new Error('Failed to save user role')
  }

  // Redirect to login page upon success
  redirect('/login?message=Account created successfully. Please sign in.')
}

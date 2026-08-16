import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function setup() {
  const users = [
    {
      email: 'jesvinsaji91@gmail.com',
      phone: '+918078778397',
      password: 'Walter9797',
      role: 'owner'
    },
    {
      email: 'picsofthemonent@gmail.com',
      phone: '+918714278397',
      password: 'Jesvin9797',
      role: 'admin'
    }
  ]

  for (const u of users) {
    console.log(`Creating user ${u.email}...`)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      phone: u.phone,
      password: u.password,
      email_confirm: true,
      phone_confirm: true
    })

    if (authError) {
      console.error(`Error creating auth user ${u.email}:`, authError.message)
      // Check if user already exists
      if (authError.message.includes('already')) {
        console.log(`User ${u.email} already exists. Attempting to update password and phone.`)
        // Find user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existing = existingUsers.users.find(x => x.email === u.email)
        if (existing) {
          const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
            password: u.password,
            phone: u.phone,
            phone_confirm: true,
            email_confirm: true
          })
          if (updateErr) console.error(`Error updating user ${u.email}:`, updateErr.message)
          else console.log(`Updated user ${u.email}`)
          
          // Upsert role
          const { error: roleErr } = await supabase.from('user_roles').upsert({ user_id: existing.id, role: u.role })
          if (roleErr) console.error(`Error setting role for ${u.email}:`, roleErr.message)
          else console.log(`Role set to ${u.role} for ${u.email}`)
        }
      }
    } else if (authData.user) {
      console.log(`Created auth user ${u.email} with ID ${authData.user.id}`)
      
      const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: authData.user.id, role: u.role })
      if (roleErr) {
        console.error(`Error setting role for ${u.email}:`, roleErr.message)
      } else {
        console.log(`Role set to ${u.role} for ${u.email}`)
      }
    }
  }
}

setup().catch(console.error)

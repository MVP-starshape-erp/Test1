import { createClient } from '@/utils/supabase/server'
import { logout } from '../login/actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
        
        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">User Session</h2>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">Email:</span> {user?.email}</p>
            <p><span className="font-medium">ID:</span> {user?.id}</p>
            <p><span className="font-medium">Last Sign In:</span> {new Date(user?.last_sign_in_at || '').toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

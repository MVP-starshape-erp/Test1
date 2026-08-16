'use client'

import { useSearchParams } from 'next/navigation'
import { verifyOTP } from '../login/actions'
import { Suspense } from 'react'

function VerifyForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const phone = searchParams.get('phone')
  const sessionId = searchParams.get('sessionId')

  return (
    <form action={verifyOTP} className="space-y-6">
      {email && <input type="hidden" name="email" value={email} />}
      {phone && <input type="hidden" name="phone" value={phone} />}
      {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
      
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-gray-700">
          6-digit OTP Code
        </label>
        <div className="mt-1">
          <input
            id="token"
            name="token"
            type="text"
            required
            maxLength={6}
            pattern="\d{6}"
            placeholder="123456"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white text-center tracking-widest text-lg"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Verify
        </button>
      </div>
    </form>
  )
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Verify your code</h1>
          <p className="mt-2 text-sm text-gray-600">
            We sent a verification code to your email or phone.
          </p>
        </div>
        
        <Suspense fallback={<div>Loading...</div>}>
          <VerifyForm />
        </Suspense>
      </div>
    </div>
  )
}

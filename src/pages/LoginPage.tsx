import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../store/useAuthStore'

export function LoginPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const ok = login(email, password)
    if (!ok) {
      setError('Invalid email or password.')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="relative min-h-dvh bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -right-40 top-40 size-[520px] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-[-200px] left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center sm:mb-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Stellar Camera Rentals</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Sign in</h1>
            <p className="mt-2 text-sm text-slate-600">Enter your credentials to open the operations console.</p>
          </div>

          <GlassCard className="!p-6 sm:!p-8">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" leftIcon={<LogIn className="size-4" />}>
                Sign in
              </Button>
            </form>
          </GlassCard>

          <p className="mt-8 text-center text-xs text-slate-500">
            Credentials are configured in the project data file. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}

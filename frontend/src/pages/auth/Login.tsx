import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, Mail, Lock, Sparkles, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../lib/api'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const reduceMotion = useReducedMotion()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, refresh_token, user } = res.data
      login(access_token, refresh_token, user)

      // Redirect based on role
      if (user.role === 'admin') navigate('/admin/dashboard')
      else if (user.role === 'teacher') navigate('/teacher/dashboard')
      else navigate('/student/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  // Quick Demo Login Handler
  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', { email: demoEmail, password: demoPass })
      const { access_token, refresh_token, user } = res.data
      login(access_token, refresh_token, user)
      if (user.role === 'admin') navigate('/admin/dashboard')
      else if (user.role === 'teacher') navigate('/teacher/dashboard')
      else navigate('/student/dashboard')
    } catch {
      setError('Demo login failed. Make sure MongoDB is running and seeded.')
    } finally {
      setIsLoading(false)
    }
  }

  const cardTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <div className="dark relative min-h-screen w-full overflow-hidden bg-[#070b1c] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_12%_-10%,rgba(99,102,241,0.38),transparent_42%),radial-gradient(900px_circle_at_88%_8%,rgba(147,51,234,0.32),transparent_40%),radial-gradient(800px_circle_at_50%_110%,rgba(59,130,246,0.22),transparent_46%),linear-gradient(165deg,#050816_0%,#0b1233_48%,#1a1040_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-16 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl motion-reduce:animate-none sm:h-96 sm:w-96"
        animate={reduceMotion ? { opacity: 0.45 } : { x: [0, 28, 0], y: [0, 18, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-1/3 h-64 w-64 rounded-full bg-violet-500/35 blur-3xl motion-reduce:animate-none sm:h-80 sm:w-80"
        animate={reduceMotion ? { opacity: 0.4 } : { x: [0, -22, 0], y: [0, 24, 0], opacity: [0.28, 0.5, 0.28] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl motion-reduce:animate-none sm:h-72 sm:w-72"
        animate={reduceMotion ? { opacity: 0.3 } : { x: [0, 16, 0], y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <motion.div
          className="w-full max-w-md space-y-7"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={cardTransition}
        >
          <div className="space-y-3 text-center">
            <div className="relative mb-1 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-[0_18px_40px_-12px_rgba(99,102,241,0.75)] ring-1 ring-white/20">
              <GraduationCap className="h-8 w-8" />
              <Sparkles className="absolute -right-1.5 -top-1.5 h-4 w-4 fill-amber-300 text-amber-300" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Smart Student Management
            </h1>
            <p className="text-sm text-indigo-100/70">
              Enterprise Student Management Platform
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-6 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.85)] backdrop-blur-2xl sm:p-8">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-xs font-medium text-rose-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="admin@sms.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
                className="h-11 border-white/15 bg-white/10 text-white placeholder:text-indigo-100/40 focus:border-indigo-400 focus:ring-indigo-400/40"
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  required
                  className="h-11 border-white/15 bg-white/10 pr-10 text-white placeholder:text-indigo-100/40 focus:border-indigo-400 focus:ring-indigo-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-8 z-10 rounded-md p-1 text-indigo-100/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-indigo-100/70">
                  <input
                    type="checkbox"
                    className="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400"
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-medium text-indigo-200 hover:text-white hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_16px_32px_-16px_rgba(99,102,241,0.9)] hover:from-indigo-400 hover:to-violet-500"
                isLoading={isLoading}
              >
                <span>Sign In</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100/55">
                Quick Demo Accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('admin@sms.edu', 'Admin@123')}
                  className="rounded-xl border border-white/12 bg-white/5 py-2.5 text-xs font-semibold text-indigo-50 transition-all hover:border-indigo-400/50 hover:bg-indigo-500/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  Admin
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('prof.sharma@sms.edu', 'Teacher@123')}
                  className="rounded-xl border border-white/12 bg-white/5 py-2.5 text-xs font-semibold text-indigo-50 transition-all hover:border-violet-400/50 hover:bg-violet-500/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  Teacher
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('alice@student.sms.edu', 'Student@123')}
                  className="rounded-xl border border-white/12 bg-white/5 py-2.5 text-xs font-semibold text-indigo-50 transition-all hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  Student
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-indigo-100/60">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-200 hover:text-white hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

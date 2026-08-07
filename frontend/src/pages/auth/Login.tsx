import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../lib/api'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
    } catch (err: any) {
      setError('Demo login failed. Make sure MongoDB is running and seeded.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-purple-600 text-white shadow-xl shadow-primary/20 mb-2">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
            Smart SMS <Sparkles className="h-5 w-5 text-amber-400 fill-amber-400" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Enterprise Student Management Platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                {error}
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
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-input bg-card text-primary focus:ring-primary" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <span>Sign In</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Quick Demo Sign Ins */}
          <div className="mt-6 border-t border-border/60 pt-4">
            <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wider mb-3">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@sms.edu', 'Admin@123')}
                className="rounded-lg border border-border bg-accent/40 py-2 text-xs font-semibold text-foreground hover:bg-primary/20 hover:border-primary/40 transition-all"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('prof.sharma@sms.edu', 'Teacher@123')}
                className="rounded-lg border border-border bg-accent/40 py-2 text-xs font-semibold text-foreground hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('alice@student.sms.edu', 'Student@123')}
                className="rounded-lg border border-border bg-accent/40 py-2 text-xs font-semibold text-foreground hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
              >
                Student
              </button>
            </div>
          </div>
        </div>

        {/* Register Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

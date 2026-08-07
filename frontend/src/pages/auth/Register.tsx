import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../lib/api'
import type { UserRole } from '../../types'

export const Register: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student' as UserRole,
    phone: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await api.post('/auth/register', formData)
      const { access_token, refresh_token, user } = res.data
      login(access_token, refresh_token, user)

      if (user.role === 'admin') navigate('/admin/dashboard')
      else if (user.role === 'teacher') navigate('/teacher/dashboard')
      else navigate('/student/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl -z-10"></div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-purple-600 text-white shadow-xl shadow-primary/20 mb-2">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Create Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Join the Smart Student Management Portal
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              name="full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleChange}
              icon={<User className="h-4 w-4" />}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="john@student.sms.edu"
              value={formData.email}
              onChange={handleChange}
              icon={<Mail className="h-4 w-4" />}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/80">User Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Administrator accounts are provisioned by existing admins, not through self-registration.
              </p>
            </div>

            <Input
              label="Phone Number (Optional)"
              name="phone"
              placeholder="+91-9876543210"
              value={formData.phone}
              onChange={handleChange}
              icon={<Phone className="h-4 w-4" />}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <span>Register Account</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl shadow-slate-950/10">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">Access denied</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">You do not have permission to view this page.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This area is restricted to the appropriate role for this student management workspace.
        </p>

        <div className="mt-7 flex gap-3">
          <Button onClick={() => navigate('/login')}>
            Back to login
          </Button>
        </div>
      </div>
    </div>
  )
}
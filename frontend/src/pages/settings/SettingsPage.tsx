import React from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Settings, Bell, ShieldCheck, Palette, Database, Lock } from 'lucide-react'

const settingSections = [
  {
    title: 'Appearance',
    description: 'Adjust the workspace theme and visual density.',
    icon: Palette,
    accent: 'from-violet-500/15 to-purple-500/5',
  },
  {
    title: 'Notifications',
    description: 'Control alerts, notices, and communication preferences.',
    icon: Bell,
    accent: 'from-sky-500/15 to-cyan-500/5',
  },
  {
    title: 'Security',
    description: 'Review session access and account protection settings.',
    icon: ShieldCheck,
    accent: 'from-emerald-500/15 to-green-500/5',
  },
  {
    title: 'Data & Sync',
    description: 'Check storage, sync status, and system connectivity.',
    icon: Database,
    accent: 'from-amber-500/15 to-orange-500/5',
  },
]

export const SettingsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace preferences</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Settings</h2>
          </div>
          <Button variant="outline" className="gap-2">
            <Lock className="h-4 w-4" /> Security overview
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {settingSections.map(({ title, description, icon: Icon, accent }) => (
              <Card key={title} className="overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <button type="button" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
                      Configure
                    </button>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <CardTitle>Profile & access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-accent/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="mt-2 text-lg font-bold text-foreground">System Administrator</p>
              </div>
              <div className="rounded-2xl border border-border bg-accent/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session</p>
                <p className="mt-2 text-sm text-foreground">Protected by JWT authentication and role-based access.</p>
              </div>
              <div className="rounded-2xl border border-border bg-accent/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Environment</p>
                <p className="mt-2 text-sm text-foreground">FastAPI + MongoDB + React + Vite</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

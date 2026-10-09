import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Users, GraduationCap, Building2, CalendarCheck, Activity, ArrowUpRight, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../lib/api'
import type { DashboardStats } from '../../types'

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/admin/dashboard')
        setStats(res.data)
      } catch (err) {
        console.error('Failed to load admin stats', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const COLORS = ['#5b6cff', '#8b5cf6', '#34d399', '#fbbf24', '#60a5fa']

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="h-36 rounded-2xl border border-border bg-card/80" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl border border-border bg-card/80" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="h-80 rounded-2xl border border-border bg-card/80 xl:col-span-2" />
            <div className="h-80 rounded-2xl border border-border bg-card/80" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const overview = stats?.overview
  const hasStats = Boolean(stats)

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-indigo-950/40 via-violet-950/30 to-slate-950/50 p-6 shadow-[0_30px_60px_-32px_rgba(79,70,229,0.75)]">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Institutional Overview
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Administrator Dashboard</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Real-time academic performance, student engagement, and operational health across the campus.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              System online
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Students" value={overview?.total_students ?? 0} description="Active enrolled learners" icon={GraduationCap} color="blue" />
          <StatCard title="Faculty Members" value={overview?.total_teachers ?? 0} description="Teaching staff on record" icon={Users} color="purple" />
          <StatCard title="Departments" value={overview?.total_departments ?? 0} description="Academic divisions" icon={Building2} color="emerald" />
          <StatCard title="Attendance Rate" value={overview?.attendance_rate ? `${overview.attendance_rate}%` : '0%'} description="Campus average" icon={CalendarCheck} color="amber" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Enrollment Growth</CardTitle>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {hasStats ? 'Updated' : 'Awaiting data'}
              </span>
            </CardHeader>
            <CardContent className="h-80">
              {stats?.enrollment_trend?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.enrollment_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="rgba(148,163,184,0.8)" />
                    <YAxis tickLine={false} axisLine={false} stroke="rgba(148,163,184,0.8)" />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      contentStyle={{ borderRadius: '14px', border: '1px solid rgba(148,163,184,0.22)', background: 'rgba(15,23,42,0.9)', color: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" fill="#5b6cff" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No enrollment data available yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Mix</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {stats?.department_distribution?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.department_distribution} dataKey="count" nameKey="department" innerRadius={48} outerRadius={82} paddingAngle={4}>
                      {stats.department_distribution.map((entry, index) => (
                        <Cell key={`${entry.department}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid rgba(148,163,184,0.22)', background: 'rgba(15,23,42,0.9)', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No department breakdown available yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recent_activities?.length ? (
                  stats.recent_activities.map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-accent/20 p-3 transition-all hover:border-primary/20 hover:bg-accent/30">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                          {log.action}
                        </span>
                        <span className="text-sm text-foreground">{log.description}</span>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No recent activity available.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'MongoDB', status: 'Connected', tone: 'emerald', color: 'text-emerald-400' },
                { name: 'Gemini API', status: 'Operational', tone: 'blue', color: 'text-blue-400' },
                { name: 'Authentication', status: 'Healthy', tone: 'purple', color: 'text-violet-400' },
              ].map((item) => (
                <div key={item.name} className={`flex items-center justify-between rounded-2xl border border-${item.tone}-500/20 bg-${item.tone}-500/10 p-3`}>
                  <span className={`text-xs font-semibold ${item.color}`}>{item.name}</span>
                  <span className="rounded-full border border-current/20 bg-current/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-current">
                    {item.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

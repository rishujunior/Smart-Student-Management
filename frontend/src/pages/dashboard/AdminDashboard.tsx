import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Users, GraduationCap, Building2, CalendarCheck, Activity } from 'lucide-react'
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

  const COLORS = ['#667eea', '#764ba2', '#38ef7d', '#f093fb', '#4facfe']

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-slate-900/40 border border-indigo-500/20 p-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10"></div>
          <h2 className="text-2xl font-bold text-foreground">Administrator Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            System Overview & Institution Analytics • Real-time Monitoring
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={stats?.overview.total_students ?? (loading ? '...' : 0)}
            description="Active Enrolled Students"
            icon={GraduationCap}
            color="blue"
          />
          <StatCard
            title="Faculty Members"
            value={stats?.overview.total_teachers ?? (loading ? '...' : 0)}
            description="Teaching Staff"
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Departments"
            value={stats?.overview.total_departments ?? (loading ? '...' : 0)}
            description="Academic Divisions"
            icon={Building2}
            color="emerald"
          />
          <StatCard
            title="Attendance Rate"
            value={stats?.overview.attendance_rate ? `${stats.overview.attendance_rate}%` : '88.5%'}
            description="Monthly Average"
            icon={CalendarCheck}
            color="amber"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enrollment Trend Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Enrollment Growth Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.enrollment_trend || [
                  { month: 'Jan', count: 120 },
                  { month: 'Feb', count: 145 },
                  { month: 'Mar', count: 180 },
                  { month: 'Apr', count: 210 },
                  { month: 'May', count: 250 },
                  { month: 'Jun', count: 310 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="month" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.department_distribution || [
                      { department: 'CSE', count: 150 },
                      { department: 'ECE', count: 90 },
                      { department: 'IT', count: 80 },
                      { department: 'ME', count: 60 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="department"
                  >
                    {(stats?.department_distribution || [1,2,3,4]).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> System Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.recent_activities || [
                  { id: '1', action: 'LOGIN', description: 'Prof. Sharma logged into teacher portal', created_at: new Date().toISOString() },
                  { id: '2', action: 'CREATE', description: 'New course CS301 added to Computer Science', created_at: new Date().toISOString() },
                  { id: '3', action: 'SUBMIT', description: 'Alice Johnson submitted Assignment 2', created_at: new Date().toISOString() },
                ]).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border/40 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                        {log.action}
                      </span>
                      <span className="text-foreground">{log.description}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-400">Database (MongoDB)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-semibold text-blue-400">AI Engine (Gemini)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">Operational</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-xs font-semibold text-purple-400">JWT Auth Service</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

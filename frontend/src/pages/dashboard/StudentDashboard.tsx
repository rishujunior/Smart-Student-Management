import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Award, CalendarCheck, BookOpen, FileText, Sparkles, Download, ArrowUpRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import type { Student, AttendanceSummary, Result } from '../../types'
import { useNavigate } from 'react-router-dom'

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [aiTip, setAiTip] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const profRes = await api.get('/students/me')
        setProfile(profRes.data)

        if (profRes.data?.id) {
          const [attRes, resRes] = await Promise.all([
            api.get(`/attendance/student/${profRes.data.id}/summary`),
            api.get(`/results/student/${profRes.data.id}`),
          ])
          setAttendance(attRes.data || [])
          setResults(resRes.data || [])
        }
      } catch (err) {
        console.error('Failed to load student dashboard', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [])

  const handleFetchAiTip = async () => {
    try {
      const res = await api.post('/ai/ask', {
        query: 'Give me a quick 2-sentence motivational study tip for engineering exams.',
      })
      setAiTip(res.data.response)
    } catch {
      setAiTip('Focus on understanding concepts, not just memorizing formulas. Review one weak area daily and practice timed problems.')
    }
  }

  const overallAttendance = attendance.length
    ? Math.round(attendance.reduce((acc, curr) => acc + curr.percentage, 0) / attendance.length)
    : 0

  const displayedResults = results.slice(0, 3)
  const displayedAttendance = attendance.slice(0, 4)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="h-40 rounded-3xl border border-border bg-card/80" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl border border-border bg-card/80" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-blue-950/35 via-indigo-950/30 to-slate-950/50 p-6">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Semester {profile?.semester || 3} • Enrolled
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Welcome back, {user?.full_name}! 👋</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enrollment No: <span className="font-mono font-semibold text-foreground">{profile?.enrollment_number || '—'}</span> • {profile?.department_name || 'Computer Science Engineering'}
              </p>
            </div>
            <Button onClick={() => window.open(`/api/v1/reports/student/${profile?.id}/pdf`, '_blank')} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Report card
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-slate-950/40 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
                <Sparkles className="h-5 w-5 fill-purple-300" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300">Gemini AI study assistant</p>
                <p className="mt-1 text-sm text-foreground">{aiTip || 'Tap for a quick motivation boost and study strategy.'}</p>
              </div>
            </div>
            <Button size="sm" variant="ai" onClick={handleFetchAiTip}>Get tip</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Current CGPA" value={profile?.cgpa ? profile.cgpa.toFixed(2) : '—'} description="Cumulative performance" icon={Award} color="purple" />
          <StatCard title="Overall Attendance" value={overallAttendance ? `${overallAttendance}%` : '—'} description="Minimum required: 75%" icon={CalendarCheck} color={overallAttendance >= 75 ? 'emerald' : 'rose'} />
          <StatCard title="Enrolled Courses" value={attendance.length || 0} description="Current semester" icon={BookOpen} color="blue" />
          <StatCard title="Pending Assignments" value={results.length ? '2' : '0'} description="Needs attention" icon={FileText} color="amber" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Attendance by subject</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/attendance')}>View all</Button>
            </CardHeader>
            <CardContent>
              {displayedAttendance.length ? (
                <div className="space-y-4">
                  {displayedAttendance.map((item) => (
                    <div key={item.course_id || item.course_name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs font-medium">
                        <span className="text-foreground">{item.course_name}</span>
                        <span className={item.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'}>{item.percentage}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-accent">
                        <div className={`h-full rounded-full ${item.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-6 text-center text-sm text-muted-foreground">No attendance summary available yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Latest marks</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/results')}>View all</Button>
            </CardHeader>
            <CardContent>
              {displayedResults.length ? (
                <div className="space-y-3">
                  {displayedResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-accent/20 p-3.5 transition-all hover:border-primary/20 hover:bg-accent/25">
                      <div>
                        <p className="font-semibold text-foreground">{result.course_name || 'Course'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{result.total_marks} / {result.max_marks} marks</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                          {result.grade}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-6 text-center text-sm text-muted-foreground">No marks have been recorded yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

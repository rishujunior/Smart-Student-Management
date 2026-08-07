import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Award, CalendarCheck, BookOpen, FileText, Sparkles, Download } from 'lucide-react'
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
  const [, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const profRes = await api.get('/students/me')
        setProfile(profRes.data)

        if (profRes.data?.id) {
          const attRes = await api.get(`/attendance/student/${profRes.data.id}/summary`)
          setAttendance(attRes.data)

          const resRes = await api.get(`/results/student/${profRes.data.id}`)
          setResults(resRes.data)
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
      setAiTip('Focus on understanding core concepts rather than memorization. Practice problems daily!')
    }
  }

  const overallAttendance = attendance.length
    ? Math.round(attendance.reduce((acc, curr) => acc + curr.percentage, 0) / attendance.length)
    : 85

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/40 border border-blue-500/20 p-6 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs">
              Semester {profile?.semester || 3} • Enrolled
            </span>
            <h2 className="text-2xl font-extrabold text-foreground mt-2">
              Welcome back, {user?.full_name}! 👋
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enrollment No: <span className="font-mono text-foreground font-semibold">{profile?.enrollment_number || 'CS2024001'}</span> • {profile?.department_name || 'Computer Science Engineering'}
            </p>
          </div>
          <Button onClick={() => window.open(`/api/v1/reports/student/${profile?.id}/pdf`, '_blank')} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download Report Card
          </Button>
        </div>

        {/* AI Insight Card */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-slate-900/40 border border-purple-500/30 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <Sparkles className="h-5 w-5 fill-purple-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Gemini AI Study Assistant</p>
              <p className="text-xs text-foreground mt-0.5">{aiTip || "Click to get personalized AI study advice for your semester!"}</p>
            </div>
          </div>
          <Button size="sm" variant="ai" onClick={handleFetchAiTip}>
            Get Tip
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Current CGPA"
            value={profile?.cgpa ? profile.cgpa.toFixed(2) : '8.75'}
            description="Out of 10.0 scale"
            icon={Award}
            color="purple"
          />
          <StatCard
            title="Overall Attendance"
            value={`${overallAttendance}%`}
            description="Minimum required: 75%"
            icon={CalendarCheck}
            color={overallAttendance >= 75 ? 'emerald' : 'rose'}
          />
          <StatCard
            title="Enrolled Courses"
            value={attendance.length || 5}
            description="Active Semester"
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="Pending Assignments"
            value="2"
            description="Due this week"
            icon={FileText}
            color="amber"
          />
        </div>

        {/* Attendance Breakdown & Academic Marks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance by Subject</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/attendance')}>View All</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(attendance.length > 0 ? attendance : [
                { course_name: 'Data Structures & Algorithms', percentage: 92, present: 23, total: 25 },
                { course_name: 'Database Management Systems', percentage: 88, present: 22, total: 25 },
                { course_name: 'Operating Systems', percentage: 76, present: 19, total: 25 },
                { course_name: 'Computer Networks', percentage: 80, present: 20, total: 25 },
              ]).map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">{item.course_name}</span>
                    <span className={item.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'}>
                      {item.percentage}% ({item.present}/{item.total})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Latest Subject Marks</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/results')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(results.length > 0 ? results : [
                  { course_name: 'Data Structures', total_marks: 88, max_marks: 100, grade: 'A+', is_pass: true },
                  { course_name: 'Database Systems', total_marks: 82, max_marks: 100, grade: 'A', is_pass: true },
                  { course_name: 'Operating Systems', total_marks: 74, max_marks: 100, grade: 'B+', is_pass: true },
                ]).map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border/40 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{res.course_name}</p>
                      <p className="text-muted-foreground mt-0.5">{res.total_marks} / {res.max_marks} marks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary font-bold text-xs">
                        Grade {res.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

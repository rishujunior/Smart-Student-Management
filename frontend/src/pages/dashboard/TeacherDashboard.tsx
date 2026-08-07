import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { BookOpen, Users, FileText, CalendarCheck, Plus, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import type { Teacher, Course, Assignment } from '../../types'
import { useNavigate } from 'react-router-dom'

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Teacher | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const profRes = await api.get('/teachers/me')
        setProfile(profRes.data)

        const courseRes = await api.get('/academic/courses')
        setCourses(courseRes.data)

        const assignRes = await api.get('/assignments')
        setAssignments(assignRes.data)
      } catch (err) {
        console.error('Failed to load teacher dashboard', err)
      }
    }

    fetchTeacherData()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/40 border border-purple-500/20 p-6 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs">
              {profile?.designation || 'Faculty Member'} • {profile?.department_name || 'CSE Department'}
            </span>
            <h2 className="text-2xl font-extrabold text-foreground mt-2">
              Welcome, {user?.full_name}! 🎓
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Employee ID: <span className="font-mono text-foreground font-semibold">{profile?.employee_id || 'TCH001'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/attendance')} variant="primary" className="gap-2">
              <CalendarCheck className="h-4 w-4" /> Take Attendance
            </Button>
            <Button onClick={() => navigate('/assignments')} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> New Assignment
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Assigned Courses"
            value={courses.length || 3}
            description="Active Semester"
            icon={BookOpen}
            color="purple"
          />
          <StatCard
            title="Total Students"
            value="120"
            description="Across all classes"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Assignments Uploaded"
            value={assignments.length || 4}
            description="Pending Evaluation: 12"
            icon={FileText}
            color="emerald"
          />
          <StatCard
            title="Attendance Marked Today"
            value="2/3"
            description="Classes recorded"
            icon={CheckCircle2}
            color="amber"
          />
        </div>

        {/* Courses & Assignments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Assigned Courses</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/courses')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(courses.length > 0 ? courses : [
                  { id: '1', name: 'Data Structures & Algorithms', code: 'CS301', credits: 4, semester: 3 },
                  { id: '2', name: 'Database Management Systems', code: 'CS302', credits: 3, semester: 3 },
                  { id: '3', name: 'Computer Networks', code: 'CS401', credits: 3, semester: 5 },
                ]).map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-3.5 rounded-xl bg-accent/30 border border-border/40 text-xs">
                    <div>
                      <span className="font-mono px-2 py-0.5 rounded bg-primary/20 text-primary font-bold mr-2">
                        {course.code}
                      </span>
                      <span className="font-bold text-foreground">{course.name}</span>
                      <p className="text-muted-foreground mt-1">Semester {course.semester} • {course.credits} Credits</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/attendance')}>
                      Attendance
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Assignments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Assignments</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/assignments')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(assignments.length > 0 ? assignments : [
                  { id: '1', title: 'Binary Trees Implementation', due_date: new Date().toISOString(), total_marks: 20, submission_count: 18 },
                  { id: '2', title: 'SQL Normalization Problem Set', due_date: new Date().toISOString(), total_marks: 30, submission_count: 24 },
                ]).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl bg-accent/30 border border-border/40 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{a.title}</p>
                      <p className="text-muted-foreground mt-0.5">Marks: {a.total_marks} • Submissions: {a.submission_count}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                      Active
                    </span>
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

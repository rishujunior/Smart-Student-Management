import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Course, Student, Semester } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export const ResultManager: React.FC = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [, setSemesters] = useState<Semester[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    semester_id: '',
    internal_marks: 35,
    external_marks: 52,
    max_internal: 40,
    max_external: 60,
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [cRes, sRes, semRes, topRes] = await Promise.all([
        api.get('/academic/courses'),
        api.get('/students'),
        api.get('/academic/semesters'),
        api.get('/results/top-performers'),
      ])
      setCourses(cRes.data || [])
      setStudents(sRes.data.students || [])
      setSemesters(semRes.data || [])
      setTopPerformers(topRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/results', formData)
      setIsModalOpen(false)
      fetchInitialData()
      toast.success('Result added successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record result')
    }
  }

  const averageCgpa = topPerformers.length
    ? (topPerformers.reduce((sum, student) => sum + Number(student.cgpa || 0), 0) / topPerformers.length).toFixed(2)
    : '—'

  const chartData = topPerformers.slice(0, 6).map((student) => ({
    name: student.student_name?.split(' ')[0] || 'Student',
    cgpa: Number(student.cgpa || 0),
  }))

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Academic assessment</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Results & Marks</h2>
          </div>
          {user?.role !== 'student' && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Record marks
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top performer</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{topPerformers[0]?.cgpa ?? '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{topPerformers[0]?.student_name || 'Awaiting results'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Average CGPA</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{averageCgpa}</p>
              <p className="mt-1 text-xs text-muted-foreground">Across top performers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pass rate</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{topPerformers.length ? '96%' : '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Current academic snapshot</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <Trophy className="h-5 w-5" /> Academic leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length ? (
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="rgba(148,163,184,0.8)" />
                      <YAxis tickLine={false} axisLine={false} stroke="rgba(148,163,184,0.8)" domain={[0, 10]} />
                      <Tooltip
                        cursor={{ fill: 'rgba(251,191,36,0.06)' }}
                        contentStyle={{ borderRadius: '14px', border: '1px solid rgba(148,163,184,0.22)', background: 'rgba(15,23,42,0.9)', color: '#e2e8f0' }}
                      />
                      <Bar dataKey="cgpa" fill="#fbbf24" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {topPerformers.slice(0, 4).map((student, index) => (
                    <div key={`${student.student_name}-${index}`} className="flex items-center justify-between rounded-2xl border border-border bg-accent/10 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{student.student_name}</p>
                          <p className="text-[11px] text-muted-foreground">{student.enrollment_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-300">{student.cgpa}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">CGPA</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No academic results are available yet.</div>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Student Marks">
          <form onSubmit={handleAddResult} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/80">Student</label>
              <select className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} required>
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.full_name} ({student.enrollment_number})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/80">Course</label>
              <select className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={formData.course_id} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })} required>
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Internal marks" type="number" value={formData.internal_marks} onChange={(e) => setFormData({ ...formData, internal_marks: Number(e.target.value) })} required />
              <Input label="External marks" type="number" value={formData.external_marks} onChange={(e) => setFormData({ ...formData, external_marks: Number(e.target.value) })} required />
            </div>

            <Button type="submit" className="w-full">Save result</Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

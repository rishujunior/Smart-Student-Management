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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Results & Marks Module</h2>
            <p className="text-sm text-muted-foreground">Record internal/external marks and calculate CGPA</p>
          </div>
          {user?.role !== 'student' && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Record Marks
            </Button>
          )}
        </div>

        {/* Top Performers Leaderboard */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <Trophy className="h-5 w-5 fill-amber-400" /> Academic Leaderboard (Top Performers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(topPerformers.length > 0 ? topPerformers : [
                { student_name: 'Alice Johnson', cgpa: 9.8, enrollment_number: 'CS2024001' },
                { student_name: 'Bob Smith', cgpa: 9.4, enrollment_number: 'CS2024002' },
                { student_name: 'Carol Williams', cgpa: 9.1, enrollment_number: 'IT2024001' },
              ]).map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3.5 rounded-xl bg-accent/40 border border-border/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-extrabold text-sm">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{p.student_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.enrollment_number}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-sm font-extrabold text-amber-400">{p.cgpa}</span>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">CGPA</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Student Marks">
          <form onSubmit={handleAddResult} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Student</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.enrollment_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Course</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                required
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Internal Marks (out of 40)"
                type="number"
                value={formData.internal_marks}
                onChange={(e) => setFormData({ ...formData, internal_marks: parseFloat(e.target.value) })}
                required
              />
              <Input
                label="External Marks (out of 60)"
                type="number"
                value={formData.external_marks}
                onChange={(e) => setFormData({ ...formData, external_marks: parseFloat(e.target.value) })}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Save Result
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

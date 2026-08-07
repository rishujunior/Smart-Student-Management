import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CalendarCheck, Download, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Course, Student } from '../../types'
import { useAuth } from '../../context/AuthContext'

export const AttendanceManager: React.FC = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({})

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const res = await api.get('/academic/courses')
      setCourses(res.data || [])
      if (res.data.length > 0) {
        setSelectedCourse(res.data[0].id)
        fetchStudentsForCourse(res.data[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStudentsForCourse = async (_courseId: string) => {
    try {
      const res = await api.get('/students')
      const allStuds = res.data.students || []
      setStudents(allStuds)

      // Initialize all as present by default
      const initialMap: Record<string, 'present' | 'absent' | 'late'> = {}
      allStuds.forEach((s: Student) => {
        initialMap[s.id] = 'present'
      })
      setAttendanceMap(initialMap)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId)
    fetchStudentsForCourse(courseId)
  }

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSubmitAttendance = async () => {
    if (!selectedCourse) return
    const records = Object.entries(attendanceMap).map(([student_id, status]) => ({
      student_id,
      status,
    }))

    try {
      await api.post('/attendance', {
        course_id: selectedCourse,
        date: new Date().toISOString(),
        records,
      })
      toast.success('Attendance saved successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save attendance')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Attendance Management</h2>
            <p className="text-sm text-muted-foreground">Mark daily class attendance & export logs</p>
          </div>
          {selectedCourse && (
            <Button
              variant="outline"
              onClick={() => window.open(`/api/v1/reports/attendance/excel?course_id=${selectedCourse}`, '_blank')}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          )}
        </div>

        {/* Course Select Header */}
        <Card>
          <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course:</span>
              <select
                className="flex h-10 w-full md:w-64 rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-muted-foreground">
              Date: <span className="font-semibold text-foreground">{new Date().toLocaleDateString()}</span>
            </span>
          </div>
        </Card>

        {/* Attendance List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Class Roster ({students.length} Students)</CardTitle>
            {user?.role !== 'student' && (
              <Button onClick={handleSubmitAttendance} variant="primary" className="gap-2">
                <CalendarCheck className="h-4 w-4" /> Save Attendance
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {students.map((s) => {
                const status = attendanceMap[s.id] || 'present'
                return (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                        {s.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.enrollment_number}</p>
                      </div>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(s.id, 'present')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          status === 'present'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-accent/40 text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(s.id, 'absent')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          status === 'absent'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                            : 'bg-accent/40 text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <X className="h-3.5 w-3.5" /> Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(s.id, 'late')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          status === 'late'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : 'bg-accent/40 text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" /> Late
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

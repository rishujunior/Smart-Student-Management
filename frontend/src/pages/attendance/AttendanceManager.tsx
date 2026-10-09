import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CalendarCheck, Download, Check, X, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Course } from '../../types'
import { useAuth } from '../../context/AuthContext'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
type RosterStudent = {
  id: string
  student_id: string
  full_name: string
  enrollment_number: string
  attendance_status: AttendanceStatus | null
  attendance_percentage: number
}
type AttendanceSession = {
  course_id: string
  date: string
  students: RosterStudent[]
  summary: {
    present: number
    absent: number
    late: number
    marked: number
    total_students: number
    coverage: number
  }
}
type StudentAttendanceSummary = {
  course_id: string
  course_code: string
  course_name: string
  present: number
  absent: number
  late: number
  total_classes: number
  attendance_percentage: number
  has_records: boolean
}

const todayLocal = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const AttendanceManager: React.FC = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayLocal)
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState<StudentAttendanceSummary | null>(null)
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus | undefined>>({})
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadCourses = async () => {
      setLoadingCourses(true)
      try {
        const response = await api.get(user?.role === 'student' ? '/attendance/student/courses' : '/attendance/courses')
        const availableCourses: Course[] = response.data || []
        if (cancelled) return
        setCourses(availableCourses)
        const initialCourse = availableCourses[0]?.id || ''
        setSelectedCourse(initialCourse)
      } catch (error) {
        if (!cancelled) {
          setLoadError('Attendance courses could not be loaded. Check your access and try again.')
          console.error(error)
        }
      } finally {
        if (!cancelled) setLoadingCourses(false)
      }
    }
    void loadCourses()
    return () => { cancelled = true }
  }, [user?.role])

  useEffect(() => {
    if (!selectedCourse || !selectedDate) {
      setStudents([])
      setAttendanceMap({})
      setStudentAttendanceSummary(null)
      return
    }

    let cancelled = false
    const loadSession = async () => {
      setLoadingRoster(true)
      setLoadError('')
      try {
        if (user?.role === 'student') {
          const response = await api.get<StudentAttendanceSummary>(`/attendance/student/courses/${selectedCourse}/summary`)
          if (cancelled) return
          setStudentAttendanceSummary(response.data)
          setStudents([])
          setAttendanceMap({})
          return
        }
        const response = await api.get<AttendanceSession>(`/attendance/course/${selectedCourse}/roster`, {
          params: { date: selectedDate },
        })
        if (cancelled) return
        const roster: RosterStudent[] = response.data.students || []
        setStudents(roster)
        setAttendanceMap(Object.fromEntries(
          roster.filter((student) => student.attendance_status).map((student) => [student.id, student.attendance_status as AttendanceStatus]),
        ))
      } catch (error) {
        if (!cancelled) {
          setStudents([])
          setAttendanceMap({})
          setStudentAttendanceSummary(null)
          setLoadError('The class roster or saved attendance could not be loaded.')
          console.error(error)
        }
      } finally {
        if (!cancelled) setLoadingRoster(false)
      }
    }
    void loadSession()
    return () => { cancelled = true }
  }, [selectedCourse, selectedDate, user?.role])

  const selectedCourseInfo = courses.find((course) => course.id === selectedCourse)

  const summary = useMemo(() => {
    const present = Object.values(attendanceMap).filter((status) => status === 'present').length
    const absent = Object.values(attendanceMap).filter((status) => status === 'absent').length
    const late = Object.values(attendanceMap).filter((status) => status === 'late').length
    const marked = Object.values(attendanceMap).filter(Boolean).length
    if (user?.role === 'student' && studentAttendanceSummary) {
      return {
        present: studentAttendanceSummary.present,
        absent: studentAttendanceSummary.absent,
        late: studentAttendanceSummary.late,
        marked: studentAttendanceSummary.total_classes,
        coverage: studentAttendanceSummary.attendance_percentage,
        risk: 0,
        totalClasses: studentAttendanceSummary.total_classes,
      }
    }
    const coverage = students.length ? Math.round((marked / students.length) * 100) : 0
    const risk = students.length ? Math.round((absent / students.length) * 100) : 0
    return { present, absent, late, marked, coverage, risk, totalClasses: students.length }
  }, [attendanceMap, studentAttendanceSummary, students.length, user?.role])

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((previous) => ({ ...previous, [studentId]: status }))
  }

  const loadCurrentSession = async () => {
    if (!selectedCourse || !selectedDate) return
    const response = await api.get<AttendanceSession>(`/attendance/course/${selectedCourse}/roster`, {
      params: { date: selectedDate },
    })
    const roster: RosterStudent[] = response.data.students || []
    setStudents(roster)
    setAttendanceMap(Object.fromEntries(
      roster.filter((student) => student.attendance_status).map((student) => [student.id, student.attendance_status as AttendanceStatus]),
    ))
  }

  const handleSubmitAttendance = async () => {
    if (!selectedCourse || !selectedDate || !summary.marked) return
    setSaving(true)
    try {
      await api.post('/attendance', {
        course_id: selectedCourse,
        date: `${selectedDate}T00:00:00.000Z`,
        records: Object.entries(attendanceMap)
          .filter((entry): entry is [string, AttendanceStatus] => Boolean(entry[1]))
          .map(([student_id, status]) => ({ student_id, status })),
      })
      toast.success('Attendance saved successfully!')
      await loadCurrentSession()
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to save attendance. Your changes were not confirmed.')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    if (!selectedCourse) return
    setExporting(true)
    try {
      const response = await api.get('/reports/attendance/excel', {
        params: { course_id: selectedCourse, date: selectedDate },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance_${selectedCourse}_${selectedDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to export attendance.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Academic operations</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Attendance Management</h2>
          </div>
          {user?.role !== 'student' && <Button variant="outline" onClick={handleExport} disabled={!selectedCourse || exporting} isLoading={exporting} className="gap-2"><Download className="h-4 w-4" /> Export excel</Button>}
        </div>

        <Card>
          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
            <label className="flex w-full flex-col gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Course
              <select
                aria-label="Course"
                className="h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
                disabled={loadingCourses || courses.length === 0}
              >
                {courses.length === 0 && <option value="">{loadingCourses ? 'Loading courses...' : 'No Semester III courses available'}</option>}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.code} — {course.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Attendance date
              <input
                aria-label="Attendance date"
                className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-normal tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                type="date"
                value={selectedDate}
                max={todayLocal()}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
          </div>
        </Card>

        {loadError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{loadError}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Present</p><p className="mt-2 text-2xl font-bold text-foreground">{summary.present}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><Check className="h-5 w-5" /></div></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Absent</p><p className="mt-2 text-2xl font-bold text-foreground">{summary.absent}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400"><X className="h-5 w-5" /></div></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Late</p><p className="mt-2 text-2xl font-bold text-foreground">{summary.late}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400"><Clock className="h-5 w-5" /></div></CardContent></Card>
          {user?.role === 'student' ? (
            <>
              <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total Classes</p><p className="mt-2 text-2xl font-bold text-foreground">{summary.totalClasses}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarCheck className="h-5 w-5" /></div></CardContent></Card>
              <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attendance Percentage</p><p className="mt-2 text-2xl font-bold text-foreground">{summary.coverage}%</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div></CardContent></Card>
            </>
          ) : (
            <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coverage</p><p className="mt-2 text-2xl font-bold text-foreground">{summary.coverage}%</p><p className="mt-1 text-xs text-muted-foreground">{summary.marked} of {students.length} marked</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div></CardContent></Card>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><CardTitle>{user?.role === 'student' ? 'My Attendance' : 'Class roster'}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{selectedCourseInfo?.name || 'Select a course'} · {selectedDate}</p></div>
            {user?.role !== 'student' && <Button onClick={handleSubmitAttendance} disabled={!summary.marked || loadingRoster || saving} isLoading={saving} className="gap-2"><CalendarCheck className="h-4 w-4" /> Save attendance</Button>}
          </CardHeader>
          <CardContent>
            {summary.risk > 20 && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"><AlertTriangle className="h-4 w-4" />Attendance risk is elevated for this class. Review the absent count and follow up with students.</div>}
            {loadingRoster ? <p className="py-10 text-center text-sm text-muted-foreground">{user?.role === 'student' ? 'Loading your attendance...' : 'Loading enrolled students and saved attendance...'}</p> : user?.role === 'student' ? (
              studentAttendanceSummary?.has_records ? <div className="py-6 text-sm text-muted-foreground">Attendance totals for {studentAttendanceSummary.course_code} · {studentAttendanceSummary.total_classes} recorded classes.</div> : <p className="py-10 text-center text-sm text-muted-foreground">No attendance has been recorded for this course yet.</p>
            ) : students.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{selectedCourse ? 'No active students are enrolled in this CSE Semester III cohort yet.' : 'No Semester III CSE courses are available.'}</p> : (
              <div className="space-y-3">
                {students.map((student) => {
                  const status = attendanceMap[student.id]
                  const buttonStyles: Record<AttendanceStatus, string> = { present: 'bg-emerald-500 text-white', absent: 'bg-rose-500 text-white', late: 'bg-amber-500 text-white', excused: 'bg-sky-500 text-white' }
                  return (
                    <div key={student.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-accent/10 p-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{student.full_name.charAt(0) || 'S'}</div><div><p className="font-semibold text-foreground">{student.full_name}</p><p className="text-xs font-mono text-muted-foreground">{student.enrollment_number || 'No enrollment number'} · Historical attendance {student.attendance_percentage.toFixed(1)}%</p></div></div>
                      <div className="flex flex-wrap items-center gap-2">{(['present', 'absent', 'late', 'excused'] as const).map((option) => <button key={option} type="button" aria-pressed={status === option} onClick={() => handleStatusChange(student.id, option)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${status === option ? buttonStyles[option] : 'bg-card text-muted-foreground hover:bg-accent'}`}>{option === 'present' ? <Check className="h-3.5 w-3.5" /> : option === 'absent' ? <X className="h-3.5 w-3.5" /> : option === 'late' ? <Clock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{option}</button>)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

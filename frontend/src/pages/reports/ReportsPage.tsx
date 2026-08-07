import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Download, FileText, Table } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Student, Course } from '../../types'

export const ReportsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/students'),
        api.get('/academic/courses'),
      ])
      setStudents(sRes.data.students || [])
      setCourses(cRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownloadPdf = () => {
    if (!selectedStudent) {
      toast.error('Please select a student')
      return
    }
    window.open(`/api/v1/reports/student/${selectedStudent}/pdf`, '_blank')
  }

  const handleDownloadExcel = () => {
    if (!selectedCourse) {
      toast.error('Please select a course')
      return
    }
    window.open(`/api/v1/reports/attendance/excel?course_id=${selectedCourse}`, '_blank')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Report Generation Center</h2>
          <p className="text-sm text-muted-foreground">Generate official PDF academic report cards & Excel attendance logs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PDF Report Card Card */}
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <FileText className="h-5 w-5 text-blue-400" /> Student PDF Report Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Generates a comprehensive PDF document containing the student's personal details, semester results, subject grades, and attendance summary.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Select Student</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="">Choose Student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.enrollment_number})
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleDownloadPdf} variant="primary" className="w-full gap-2">
                <Download className="h-4 w-4" /> Download Official PDF Report
              </Button>
            </CardContent>
          </Card>

          {/* Excel Attendance Card */}
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <Table className="h-5 w-5 text-emerald-400" /> Course Attendance Excel Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Exports all recorded attendance logs for a specific course into an formatted Excel workbook (.xlsx).
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Select Course</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <option value="">Choose Course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleDownloadExcel} variant="secondary" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-4 w-4" /> Export Attendance (.XLSX)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

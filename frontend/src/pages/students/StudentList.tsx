import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Search, UserPlus, Download, BookOpenText, BarChart3, FileText } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Student, Department } from '../../types'

type StudentFilter = 'all' | 'active' | 'inactive'
type StudentTab = 'Overview' | 'Academic' | 'Subjects' | 'Attendance' | 'Results' | 'Assignments'

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StudentFilter>('all')
  const [sortKey, setSortKey] = useState<'full_name' | 'semester' | 'batch_year'>('full_name')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<StudentTab>('Overview')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    user_id: '',
    enrollment_number: '',
    department_id: '',
    semester: 1,
    batch_year: 2024,
    guardian_name: '',
    guardian_phone: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!selectedStudentId && students.length) {
      setSelectedStudentId(students[0].id)
    }
  }, [selectedStudentId, students])

  const fetchData = async () => {
    try {
      const [studRes, deptRes] = await Promise.all([
        api.get('/students'),
        api.get('/academic/departments'),
      ])
      setStudents(studRes.data.students || [])
      setDepartments(deptRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/students', formData)
      setIsModalOpen(false)
      fetchData()
      toast.success('Student profile created successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create student')
    }
  }

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim()

    const sorted = [...students].filter((s) => {
      const matchesSearch =
        !query ||
        s.full_name?.toLowerCase().includes(query) ||
        s.enrollment_number?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && s.is_active) ||
        (filter === 'inactive' && !s.is_active)

      return matchesSearch && matchesFilter
    })

    sorted.sort((a, b) => {
      if (sortKey === 'semester') return (a.semester || 0) - (b.semester || 0)
      if (sortKey === 'batch_year') return (a.batch_year || 0) - (b.batch_year || 0)
      return (a.full_name || '').localeCompare(b.full_name || '')
    })

    return sorted
  }, [students, search, filter, sortKey])

  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const paginatedStudents = filteredStudents.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter, sortKey])

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || paginatedStudents[0] || null

  const tabs: StudentTab[] = ['Overview', 'Academic', 'Subjects', 'Attendance', 'Results', 'Assignments']

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Student intelligence</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Student Directory</h2>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add student
          </Button>
        </div>

        <Card>
          <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-md">
              <Input
                placeholder="Search by name, enrollment, or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as StudentFilter)}
                className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">All students</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as 'full_name' | 'semester' | 'batch_year')}
                className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="full_name">Sort by name</option>
                <option value="semester">Sort by semester</option>
                <option value="batch_year">Sort by batch</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="bg-accent/25 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Enrollment</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Semester</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading student records...</td>
                    </tr>
                  ) : paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No students match the current filters.</td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`cursor-pointer border-b border-border/50 transition-all hover:bg-accent/20 ${selectedStudent?.id === student.id ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                              {student.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{student.full_name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{student.enrollment_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{student.department_name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">Sem {student.semester}</td>
                        <td className="px-4 py-3">
                          <span className={`status-pill ${student.is_active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/30 bg-slate-500/10 text-slate-300'}`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); window.open(`/api/v1/reports/student/${student.id}/pdf`, '_blank') }}>
                              <Download className="h-3.5 w-3.5" />
                              Report
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-accent/10 px-4 py-3">
              <p className="text-xs text-muted-foreground">Page {currentPageSafe} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPageSafe <= 1}>Prev</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPageSafe >= totalPages}>Next</Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {selectedStudent ? (
              <>
                <div className="border-b border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-lg font-bold text-primary">
                      {selectedStudent.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{selectedStudent.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{selectedStudent.enrollment_number}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-border px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${activeTab === tab ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground hover:text-foreground'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  {activeTab === 'Overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-2xl border border-border bg-accent/10 p-3">
                          <p className="text-muted-foreground">Department</p>
                          <p className="mt-2 font-semibold text-foreground">{selectedStudent.department_name || '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-accent/10 p-3">
                          <p className="text-muted-foreground">Semester</p>
                          <p className="mt-2 font-semibold text-foreground">{selectedStudent.semester}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-accent/10 p-3">
                          <p className="text-muted-foreground">Batch</p>
                          <p className="mt-2 font-semibold text-foreground">{selectedStudent.batch_year}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-accent/10 p-3">
                          <p className="text-muted-foreground">CGPA</p>
                          <p className="mt-2 font-semibold text-foreground">{selectedStudent.cgpa ?? '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Academic' && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-accent/10 p-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Academic record</p>
                        <p className="mt-2 font-medium text-foreground">Current standing: {selectedStudent.cgpa ? `CGPA ${selectedStudent.cgpa.toFixed(2)}` : 'Awaiting results'} </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Subjects' && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-accent/10 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground"><BookOpenText className="h-4 w-4 text-primary" /> Subject plan</div>
                        <p className="mt-2 text-sm text-muted-foreground">Semester {selectedStudent.semester} academic plan is assigned and tracked through the academic module.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Attendance' && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-accent/10 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">Attendance</span>
                          <span className="text-primary">{selectedStudent.attendance_percentage ?? '—'}%</span>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-accent">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${selectedStudent.attendance_percentage ?? 0}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Results' && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-accent/10 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground"><BarChart3 className="h-4 w-4 text-primary" /> Academic performance</div>
                        <p className="mt-2 text-sm text-muted-foreground">Results continue to populate from the marks module once submitted for this student.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Assignments' && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-accent/10 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground"><FileText className="h-4 w-4 text-primary" /> Assignment tracking</div>
                        <p className="mt-2 text-sm text-muted-foreground">Submissions and evaluation details appear here after assignment activity is recorded.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">Select a student to view profile details.</div>
            )}
          </Card>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Student">
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <Input label="User ID" value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} placeholder="MongoDB user id" required />
            <Input label="Enrollment number" value={formData.enrollment_number} onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })} placeholder="CS2024099" required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/80">Department</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Semester" type="number" min={1} max={10} value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })} />
              <Input label="Batch year" type="number" value={formData.batch_year} onChange={(e) => setFormData({ ...formData, batch_year: Number(e.target.value) })} />
            </div>
            <Input label="Guardian name" value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })} />
            <Button type="submit" className="w-full">Create profile</Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Search, User } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Course, Department } from '../../types'

const getCourseType = (course: Course) => {
  const type = course.subject_type?.toLowerCase()
  if (type === 'lab' || type === 'practical') return 'Lab'
  if (type === 'project') return 'Project'
  if (type === 'workshop') return 'Workshop'
  if (type === 'elective') return 'Elective'
  return 'Theory'
}

const getEnrollmentStatus = (course: Course) => (course.is_active ? 'Open' : 'Closed')

export const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    credits: null as number | null,
    semester: 3,
    description: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const departmentResponse = await api.get('/academic/departments')
      const departmentList: Department[] = departmentResponse.data || []
      setDepartments(departmentList)
      const cseDepartment = departmentList.find((department) => department.code.toUpperCase() === 'CSE')
      if (!cseDepartment) {
        setCourses([])
        return
      }
      const courseResponse = await api.get('/academic/courses', {
        params: { department_id: cseDepartment.id, semester: 3 },
      })
      setCourses(courseResponse.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/academic/courses', formData)
      setIsModalOpen(false)
      fetchData()
      toast.success('Course created successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create course')
    }
  }

  const filteredCourses = useMemo(() => {
    const query = search.toLowerCase().trim()
    return courses.filter((course) => {
      if (!query) return true
      return course.name.toLowerCase().includes(query) || course.code.toLowerCase().includes(query)
    })
  }, [courses, search])

  const semesterThreeCourses = filteredCourses

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Academic curriculum</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Subjects & Course Catalog</h2>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add subject
          </Button>
        </div>

        <Card>
          <div className="p-3">
            <Input
              placeholder="Search subjects by code or title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </Card>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Semester focus</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">Semester III overview</h3>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {semesterThreeCourses.length} subjects in view
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {semesterThreeCourses.map((course) => {
            const type = getCourseType(course)
            const typeStyles = {
              Theory: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
              Lab: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
              Project: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
              Elective: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
              Workshop: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
            }

            return (
              <Card key={course.id} className="group transition-all hover:-translate-y-0.5 hover:border-primary/25">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-primary/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-primary">{course.code}</span>
                  <span className={`status-pill ${typeStyles[type as keyof typeof typeStyles] || 'border-border bg-accent/20 text-muted-foreground'}`}>{type}</span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-foreground">{course.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{course.department_name || 'Computer Science & Engineering'} • Semester {course.semester}</p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-border bg-accent/10 p-2.5">
                    <p className="text-muted-foreground">Credits</p>
                    <p className="mt-1 font-semibold text-foreground">{course.credits ?? 'Not specified'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-accent/10 p-2.5">
                    <p className="text-muted-foreground">Semester</p>
                    <p className="mt-1 font-semibold text-foreground">{course.semester}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-accent/10 p-2.5">
                    <p className="text-muted-foreground">Teacher</p>
                    <p className="mt-1 font-semibold text-foreground">{course.teacher_name || course.faculty_name || 'Not assigned'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-accent/10 p-2.5">
                    <p className="text-muted-foreground">Enrollment</p>
                    <p className="mt-1 font-semibold text-foreground">{getEnrollmentStatus(course)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" />{course.teacher_name || course.faculty_name ? 'Assigned' : 'Not assigned'}</span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${course.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-300'}`}>
                    {course.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Subject">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Subject title" placeholder="Data Structures & Algorithms" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Subject code" placeholder="CS301" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/80">Department</label>
              <select className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Credits" type="number" min={1} max={10} value={formData.credits ?? ''} onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) || null })} />
              <Input label="Semester" type="number" min={1} max={10} value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })} />
            </div>
            <Button type="submit" className="w-full">Create subject</Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

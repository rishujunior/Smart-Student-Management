import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Search, User } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Course, Department } from '../../types'

export const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    credits: 3,
    semester: 1,
    description: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [cRes, dRes] = await Promise.all([
        api.get('/academic/courses'),
        api.get('/academic/departments'),
      ])
      setCourses(cRes.data || [])
      setDepartments(dRes.data || [])
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

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Course Catalog</h2>
            <p className="text-sm text-muted-foreground">Manage curriculum subjects, credits, and faculty assignments</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        </div>

        <Card>
          <div className="p-2">
            <Input
              placeholder="Search courses by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => (
            <Card key={c.id} className="relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/20 text-primary">
                    {c.code}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-muted-foreground">
                    Sem {c.semester} • {c.credits} Credits
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-3">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{c.department_name || 'CSE'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-purple-400" />
                  <span>{c.teacher_name || 'Unassigned'}</span>
                </div>
                <span className="text-emerald-400 font-bold">Active</span>
              </div>
            </Card>
          ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Course">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Course Title"
              placeholder="Data Structures & Algorithms"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Course Code"
              placeholder="CS301"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Department</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Credits"
                type="number"
                min={1}
                max={10}
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
              />
              <Input
                label="Semester"
                type="number"
                min={1}
                max={10}
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
              />
            </div>
            <Button type="submit" className="w-full">
              Create Course
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

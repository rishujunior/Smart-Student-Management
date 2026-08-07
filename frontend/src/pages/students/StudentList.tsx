import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Search, UserPlus, Download } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Student, Department } from '../../types'

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [, setLoading] = useState(true)

  // New Student Form State
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

  const filteredStudents = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollment_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Directory</h2>
            <p className="text-sm text-muted-foreground">
              Manage student records, enrollments, and academic details
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        </div>

        {/* Search */}
        <Card>
          <div className="p-2">
            <Input
              placeholder="Search by name, enrollment number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </Card>

        {/* Student Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-accent/40 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Enrollment No</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No student records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                          {s.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-xs">{s.enrollment_number}</td>
                      <td className="px-4 py-3">{s.department_name || 'CSE'}</td>
                      <td className="px-4 py-3">Sem {s.semester}</td>
                      <td className="px-4 py-3">{s.batch_year}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/api/v1/reports/student/${s.id}/pdf`, '_blank')}
                        >
                          <Download className="h-4 w-4" /> Report Card
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Student">
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <Input
              label="User ID (MongoDB User _id)"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              placeholder="e.g. 64f1a2b3c4d5e6f7a8b9c0d1"
              required
            />
            <Input
              label="Enrollment Number"
              value={formData.enrollment_number}
              onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
              placeholder="CS2024099"
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
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Semester"
                type="number"
                min={1}
                max={10}
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
              />
              <Input
                label="Batch Year"
                type="number"
                value={formData.batch_year}
                onChange={(e) => setFormData({ ...formData, batch_year: parseInt(e.target.value) })}
              />
            </div>
            <Input
              label="Guardian Name"
              value={formData.guardian_name}
              onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
            />
            <Button type="submit" className="w-full">
              Create Student Profile
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { UserPlus, Search } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Teacher, Department } from '../../types'

export const TeacherList: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    user_id: '',
    employee_id: '',
    department_id: '',
    designation: 'Assistant Professor',
    qualification: 'M.Tech',
    experience_years: 5,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tRes, dRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/academic/departments'),
      ])
      setTeachers(tRes.data.teachers || [])
      setDepartments(dRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/teachers', formData)
      setIsModalOpen(false)
      fetchData()
      toast.success('Faculty profile created successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create teacher')
    }
  }

  const filteredTeachers = teachers.filter((t) =>
    t.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Faculty Directory</h2>
            <p className="text-sm text-muted-foreground">Manage teaching staff and department assignments</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Teacher
          </Button>
        </div>

        <Card>
          <div className="p-2">
            <Input
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((t) => (
            <Card key={t.id} className="relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 font-bold text-lg">
                  {t.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate">{t.full_name}</h4>
                  <p className="text-xs text-purple-400 font-medium">{t.designation}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{t.email}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-accent text-foreground font-mono">{t.employee_id}</span>
                    <span>• {t.qualification}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Faculty Member">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="User ID"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              required
            />
            <Input
              label="Employee ID"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              placeholder="TCH101"
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
            <Input
              label="Designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            />
            <Button type="submit" className="w-full">
              Create Faculty Profile
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Building2, Plus, Users, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Department } from '../../types'

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/academic/departments')
      setDepartments(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/academic/departments', formData)
      setIsModalOpen(false)
      fetchDepartments()
      toast.success('Department created successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create department')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Academic Departments</h2>
            <p className="text-sm text-muted-foreground">Manage institute divisions and counts</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept.id} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
                    {dept.code}
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-2">{dept.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dept.description}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                  <span>{dept.student_count || 0} Students</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>{dept.teacher_count || 0} Faculty</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Department">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Department Name"
              placeholder="Computer Science Engineering"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Department Code"
              placeholder="CSE"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <Input
              label="Description"
              placeholder="Brief description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Button type="submit" className="w-full">
              Create Department
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

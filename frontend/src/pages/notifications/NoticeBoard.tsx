import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Pin } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Notification } from '../../types'
import { useAuth } from '../../context/AuthContext'

export const NoticeBoard: React.FC = () => {
  const { user } = useAuth()
  const [notices, setNotices] = useState<Notification[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement',
    target_role: 'all',
  })

  useEffect(() => {
    fetchNotices()
  }, [])

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notifications')
      setNotices(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/notifications', formData)
      setIsModalOpen(false)
      fetchNotices()
      toast.success('Notice published successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to post announcement')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Notice Board</h2>
            <p className="text-sm text-muted-foreground">University announcements, exam schedules & department alerts</p>
          </div>
          {user?.role === 'admin' && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Post Notice
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {notices.map((n) => (
            <Card key={n.id} className="relative overflow-hidden border-l-4 border-l-primary">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
                    <Pin className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {n.type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mt-3">{n.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
            </Card>
          ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Post Announcement">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Announcement Title"
              placeholder="Mid-Term Exam Schedule"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Input
              label="Message / Body"
              placeholder="Detailed announcement text..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Category</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="announcement">Announcement</option>
                  <option value="exam">Exam</option>
                  <option value="assignment">Assignment</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Target Audience</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                >
                  <option value="all">Everyone</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Faculty Only</option>
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Publish Notice
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

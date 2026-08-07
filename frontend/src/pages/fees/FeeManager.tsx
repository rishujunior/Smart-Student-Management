import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { FeeRecord, Student } from '../../types'
import { useAuth } from '../../context/AuthContext'

export const FeeManager: React.FC = () => {
  const { user } = useAuth()
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    student_id: '',
    amount: 50000,
    description: 'Semester 3 Tuition Fee',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    fee_type: 'tuition',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      if (user?.role === 'student') {
        const studentRes = await api.get('/students/me')
        if (studentRes.data?.id) {
          const res = await api.get(`/fees/student/${studentRes.data.id}`)
          setFees(res.data || [])
        }
      } else {
        const sRes = await api.get('/students')
        setStudents(sRes.data.students || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/fees', {
        ...formData,
        due_date: new Date(formData.due_date).toISOString(),
      })
      setIsModalOpen(false)
      fetchData()
      toast.success('Fee record created!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create fee record')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Fee Management</h2>
            <p className="text-sm text-muted-foreground">Track tuition, hostel, and examination dues</p>
          </div>
          {user?.role === 'admin' && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Issue Fee Record
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fee Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {(fees.length > 0 ? fees : [
                { id: '1', description: 'Semester 3 Tuition Fee', amount: 45000, amount_paid: 45000, balance: 0, payment_status: 'paid', due_date: '2024-10-15' },
                { id: '2', description: 'Hostel & Mess Fee', amount: 25000, amount_paid: 10000, balance: 15000, payment_status: 'partial', due_date: '2024-11-01' },
              ]).map((fee: any) => (
                <div key={fee.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-foreground">{fee.description}</p>
                    <p className="text-xs text-muted-foreground">Due: {fee.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground">₹{fee.amount.toLocaleString()}</p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                        fee.payment_status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {fee.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue New Fee Notice">
          <form onSubmit={handleCreateFee} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Student</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.enrollment_number})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Fee Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <Input
              label="Amount (₹)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              required
            />
            <Button type="submit" className="w-full">
              Issue Fee Notice
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

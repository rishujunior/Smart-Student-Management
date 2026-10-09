import React, { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Upload, Clock, CheckCircle2, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import type { Assignment, Course, Submission } from '../../types'
import { useAuth } from '../../context/AuthContext'

export const AssignmentList: React.FC = () => {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [submissionText, setSubmissionText] = useState('')
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    total_marks: 20,
  })

  const fetchData = useCallback(async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/academic/courses'),
      ])
      setAssignments(aRes.data || [])
      setCourses(cRes.data || [])

      if (user?.role === 'student') {
        const sRes = await api.get('/assignments/submissions/student')
        setMySubmissions(sRes.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }, [user?.role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/assignments', {
        ...formData,
        due_date: new Date(formData.due_date).toISOString(),
      })
      setIsModalOpen(false)
      fetchData()
      toast.success('Assignment published successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create assignment')
    }
  }

  const getSubmissionFor = (assignmentId: string) =>
    mySubmissions.find((s) => s.assignment_id === assignmentId)

  const openSubmitModal = (assignment: Assignment) => {
    const existing = getSubmissionFor(assignment.id)
    setActiveAssignment(assignment)
    setSubmissionText(existing?.content || '')
    setSubmissionFile(null)
    setIsSubmitModalOpen(true)
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAssignment) return
    if (!submissionText.trim() && !submissionFile) {
      toast.error('Add a note or attach a file before submitting')
      return
    }

    setIsSubmitting(true)
    try {
      const form = new FormData()
      if (submissionText.trim()) form.append('content', submissionText.trim())
      if (submissionFile) form.append('file', submissionFile)

      await api.post(`/assignments/${activeAssignment.id}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Assignment submitted successfully!')
      setIsSubmitModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Assignments Portal</h2>
            <p className="text-sm text-muted-foreground">Manage coursework, submissions, and deadlines</p>
          </div>
          {user?.role !== 'student' && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Assignment
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => {
            const submission = getSubmissionFor(a.id)
            const isOverdue = new Date(a.due_date).getTime() < Date.now()
            return (
              <Card key={a.id} className="relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/20 text-primary">
                      {a.course_name || 'Course'}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${isOverdue && !submission ? 'text-rose-400 font-semibold' : 'text-muted-foreground'}`}>
                      <Clock className="h-3.5 w-3.5" /> Due: {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-3">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Total Marks: {a.total_marks}</span>
                  {user?.role === 'student' ? (
                    submission ? (
                      <div className="flex items-center gap-2">
                        {submission.is_late && (
                          <span className="text-[10px] font-bold uppercase text-amber-400">Late</span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openSubmitModal(a)} className="gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Submitted
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => openSubmitModal(a)} className="gap-1.5">
                        <Upload className="h-3.5 w-3.5" /> Submit Work
                      </Button>
                    )
                  ) : (
                    <span className="text-xs font-semibold text-purple-400">
                      {a.submission_count} Submissions
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Assignment">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Title"
              placeholder="Assignment 1: Binary Search Trees"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Course</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                required
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Description"
              placeholder="Detailed instructions..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due Date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
              <Input
                label="Total Marks"
                type="number"
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: parseFloat(e.target.value) })}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Publish Assignment
            </Button>
          </form>
        </Modal>

        {/* Student Submission Modal */}
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title={activeAssignment ? `Submit: ${activeAssignment.title}` : 'Submit Assignment'}
        >
          <form onSubmit={handleSubmitWork} className="space-y-4">
            {activeAssignment && new Date(activeAssignment.due_date).getTime() < Date.now() && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400 font-medium">
                This assignment is past its due date. Your submission will be marked as late.
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Notes / Answer (optional if attaching a file)</label>
              <textarea
                className="flex min-h-24 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Write your answer or notes here..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Attach File (optional)
              </label>
              <input
                type="file"
                onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                className="flex w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
              />
            </div>
            <Button type="submit" className="w-full gap-2" isLoading={isSubmitting}>
              <Upload className="h-4 w-4" /> Submit Assignment
            </Button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

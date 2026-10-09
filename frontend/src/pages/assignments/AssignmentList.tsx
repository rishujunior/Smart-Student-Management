import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Upload, Clock, CheckCircle2, Paperclip, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { cn } from '../../lib/utils'
import type { Assignment, Course, Submission } from '../../types'
import { useAuth } from '../../context/AuthContext'

const dueTime = (assignment: Assignment) => new Date(assignment.due_date).getTime()

const sortPending = (items: Assignment[]) => [...items].sort((left, right) => dueTime(left) - dueTime(right))

export const AssignmentList: React.FC = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const targetAssignmentId = searchParams.get('id') || searchParams.get('assignment_id')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [submissionText, setSubmissionText] = useState('')
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    total_marks: 20,
  })

  const isStudent = user?.role === 'student'

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      let availableCourses: Course[] = []
      if (user?.role === 'teacher') {
        const profRes = await api.get('/teachers/me')
        const cRes = await api.get('/academic/courses', {
          params: { teacher_id: profRes.data.id },
        })
        availableCourses = cRes.data || []
      } else {
        const cRes = await api.get('/academic/courses')
        availableCourses = cRes.data || []
      }
      setCourses(availableCourses)

      const aRes = await api.get('/assignments')
      setAssignments(aRes.data || [])

      if (user?.role === 'student') {
        const sRes = await api.get('/assignments/submissions/student')
        setMySubmissions(sRes.data || [])
      }
    } catch (err) {
      console.error(err)
      setLoadError('Unable to load assignments. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (targetAssignmentId && assignments.length > 0) {
      const target = assignments.find((a) => a.id === targetAssignmentId)
      if (target) {
        if (user?.role === 'student') {
          const existing = mySubmissions.find((s) => s.assignment_id === target.id)
          setActiveAssignment(target)
          setSubmissionText(existing?.content || '')
          setSubmissionFile(null)
          setIsSubmitModalOpen(true)
        }
        const el = document.getElementById(`assignment-${target.id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [targetAssignmentId, assignments, mySubmissions, user?.role])

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

  const pendingAssignments = useMemo(() => {
    const pending = assignments.filter(
      (assignment) => assignment.student_status === 'pending' || assignment.student_status === 'overdue',
    )
    return sortPending(pending)
  }, [assignments, mySubmissions])

  const completedAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.student_status === 'submitted')
        .sort((left, right) => {
          const leftSubmitted = getSubmissionFor(left.id)?.submitted_at || left.due_date
          const rightSubmitted = getSubmissionFor(right.id)?.submitted_at || right.due_date
          return new Date(rightSubmitted).getTime() - new Date(leftSubmitted).getTime()
        }),
    [assignments, mySubmissions],
  )

  const renderAssignmentCard = (assignment: Assignment) => {
    const submission = getSubmissionFor(assignment.id)
    // Student status is calculated and scoped by the API. The submission detail is
    // only used to enrich completed cards with its timestamp, grade, and feedback.
    const status = isStudent ? assignment.student_status : undefined
    const isOverdue = status === 'overdue'

    return (
      <Card
        key={assignment.id}
        id={`assignment-${assignment.id}`}
        className={cn(
          'relative flex flex-col justify-between transition-all duration-300',
          assignment.id === targetAssignmentId && 'ring-2 ring-primary border-primary shadow-lg shadow-primary/20',
          isOverdue && isStudent && 'border-rose-500/30',
        )}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {assignment.course_code && (
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-accent text-foreground">
                  {assignment.course_code}
                </span>
              )}
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/20 text-primary">
                {assignment.course_name || 'Course'}
              </span>
            </div>
            {isStudent ? (
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg',
                  isOverdue ? 'bg-rose-500/15 text-rose-400' : status === 'submitted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
                )}
              >
                  {isOverdue ? 'Overdue' : status === 'submitted' ? 'Completed' : 'Pending'}
              </span>
            ) : (
              <span className={`flex items-center gap-1 text-xs ${isOverdue && !submission ? 'text-rose-400 font-semibold' : 'text-muted-foreground'}`}>
                <Clock className="h-3.5 w-3.5" /> Due: {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground mt-3">{assignment.title}</h3>
          {assignment.teacher_name && assignment.teacher_name !== 'Unknown' && (
            <p className="text-xs text-muted-foreground mt-1">Instructor: {assignment.teacher_name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{assignment.description}</p>
        </div>

        <div className="mt-6 pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-foreground">Total Marks: {assignment.total_marks}</span>
            {isStudent && (
              <span className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-rose-400 font-semibold' : 'text-muted-foreground')}>
                {isOverdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          {isStudent ? (
            status === 'submitted' ? (
              <div className="text-right text-xs">
                <div className="flex items-center justify-end gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                  {submission?.is_late && <span className="font-bold uppercase text-amber-400">Late</span>}
                </div>
                {submission?.submitted_at && <p className="mt-1 text-muted-foreground">Submitted {new Date(submission.submitted_at).toLocaleDateString()}</p>}
                {submission?.is_graded && <p className="mt-1 text-primary">Marks: {submission.marks_obtained ?? '—'}</p>}
              </div>
            ) : (
              <Button size="sm" variant="primary" onClick={() => openSubmitModal(assignment)} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Submit Work
              </Button>
            )
          ) : (
            <span className="text-xs font-semibold text-purple-400">
              {assignment.submission_count} Submissions
            </span>
          )}
        </div>
      </Card>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isStudent ? 'Student Assignments' : 'Assignments Portal'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isStudent
                ? 'All currently pending and overdue coursework for your enrolled courses'
                : 'Manage coursework, submissions, and deadlines'}
            </p>
          </div>
          {!isStudent && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Assignment
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-accent/10 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
            <p className="text-sm text-rose-400 font-medium">{loadError}</p>
            <Button className="mt-4" variant="outline" onClick={fetchData}>
              Retry
            </Button>
          </div>
        ) : isStudent ? (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Pending</h3>
                <span className="text-xs text-muted-foreground">{pendingAssignments.length} assignment{pendingAssignments.length === 1 ? '' : 's'}</span>
              </div>
              {pendingAssignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-8 text-center text-sm text-muted-foreground">
                  No pending assignments right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingAssignments.map(renderAssignmentCard)}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Completed</h3>
                <span className="text-xs text-muted-foreground">{completedAssignments.length} assignment{completedAssignments.length === 1 ? '' : 's'}</span>
              </div>
              {completedAssignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-8 text-center text-sm text-muted-foreground">
                  No completed assignments yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedAssignments.map(renderAssignmentCard)}
                </div>
              )}
            </section>
          </>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-8 text-center text-sm text-muted-foreground">
            No assignments have been published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map(renderAssignmentCard)}
          </div>
        )}

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

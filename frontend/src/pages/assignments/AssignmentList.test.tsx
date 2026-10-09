import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Assignment } from '../../types'

const mockGet = vi.fn()
const mockPost = vi.fn()
let mockRole = 'student'

vi.mock('../../lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', full_name: 'Aayush_Singh', role: mockRole } }),
}))

vi.mock('../../components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { AssignmentList } from './AssignmentList'

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString()

const makeAssignment = (overrides: Partial<Assignment> & Pick<Assignment, 'id' | 'title' | 'student_status'>): Assignment => ({
  course_id: 'course-1',
  course_name: 'Mathematics-IV',
  course_code: 'BAS303',
  teacher_id: 'teacher-1',
  teacher_name: 'Prof. Rajesh Sharma',
  due_date: daysFromNow(5),
  total_marks: 20,
  is_active: true,
  submission_count: 0,
  has_submitted: overrides.student_status === 'submitted',
  description: 'Complete the unit exercises.',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('Student Assignments pending list', () => {
  beforeEach(() => {
    mockRole = 'student'
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('shows loading then every pending and overdue assignment with metadata', async () => {
    const overdue = makeAssignment({
      id: 'a-overdue',
      title: 'Overdue Lab Report',
      student_status: 'overdue',
      due_date: daysFromNow(-4),
      course_code: 'BCS301',
      course_name: 'Data Structure',
      teacher_name: 'Alok Kumar Srivastav',
    })
    const soon = makeAssignment({
      id: 'a-soon',
      title: 'Nearest Pending Quiz',
      student_status: 'pending',
      due_date: daysFromNow(1),
    })
    const later = makeAssignment({
      id: 'a-later',
      title: 'Later Pending Essay',
      student_status: 'pending',
      due_date: daysFromNow(14),
    })
    const submitted = makeAssignment({
      id: 'a-done',
      title: 'Already Submitted Work',
      student_status: 'submitted',
      has_submitted: true,
    })

    mockGet.mockImplementation((path: string) => {
      if (path === '/academic/courses') return Promise.resolve({ data: [] })
      if (path === '/assignments') {
        return Promise.resolve({ data: [later, submitted, soon, overdue] })
      }
      if (path === '/assignments/submissions/student') {
        return Promise.resolve({
          data: [{ id: 'sub-1', assignment_id: 'a-done', student_id: 'stu-1', submitted_at: daysFromNow(-1), is_late: false, is_graded: false }],
        })
      }
      return Promise.reject(new Error(`Unexpected path ${path}`))
    })

    render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>,
    )

    expect(screen.getByText(/loading assignments/i)).toBeInTheDocument()

    expect(await screen.findByText('Overdue Lab Report')).toBeInTheDocument()
    expect(screen.getByText('Nearest Pending Quiz')).toBeInTheDocument()
    expect(screen.getByText('Later Pending Essay')).toBeInTheDocument()

    const pendingSection = screen.getByRole('heading', { name: 'Pending' }).closest('section')
    expect(pendingSection).toBeTruthy()
    expect(within(pendingSection as HTMLElement).queryByText('Already Submitted Work')).not.toBeInTheDocument()
    const completedSection = screen.getByRole('heading', { name: 'Completed' }).closest('section')
    expect(completedSection).toBeTruthy()
    expect(within(completedSection as HTMLElement).getByText('Already Submitted Work')).toBeInTheDocument()
    expect(within(completedSection as HTMLElement).getByText(/^Submitted /)).toBeInTheDocument()

    expect(screen.getByText('BCS301')).toBeInTheDocument()
    expect(screen.getByText('Data Structure')).toBeInTheDocument()
    expect(screen.getByText(/Instructor: Alok Kumar Srivastav/)).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Total Marks: 20/).length).toBeGreaterThan(0)

    const pendingCards = (pendingSection as HTMLElement).querySelectorAll('[id^="assignment-"]')
    expect(pendingCards[0].id).toBe('assignment-a-overdue')
    expect(pendingCards[1].id).toBe('assignment-a-soon')
    expect(pendingCards[2].id).toBe('assignment-a-later')
  })

  it('renders every pending assignment without truncating the list', async () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      makeAssignment({
        id: `pending-${index}`,
        title: `Pending Task ${index + 1}`,
        student_status: 'pending',
        due_date: daysFromNow(index + 1),
      }),
    )
    mockGet.mockImplementation((path: string) => {
      if (path === '/academic/courses') return Promise.resolve({ data: [] })
      if (path === '/assignments') return Promise.resolve({ data: many })
      if (path === '/assignments/submissions/student') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected path ${path}`))
    })

    render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>,
    )

    for (const assignment of many) {
      expect(await screen.findByText(assignment.title)).toBeInTheDocument()
    }
    expect(screen.getByText('8 assignments')).toBeInTheDocument()
  })

  it('shows an empty pending state', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/academic/courses') return Promise.resolve({ data: [] })
      if (path === '/assignments') return Promise.resolve({ data: [] })
      if (path === '/assignments/submissions/student') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected path ${path}`))
    })

    render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No pending assignments right now.')).toBeInTheDocument()
    expect(screen.getByText('No completed assignments yet.')).toBeInTheDocument()
  })

  it('shows an error state when the assignments request fails', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/academic/courses') return Promise.resolve({ data: [] })
      if (path === '/assignments') return Promise.reject(new Error('network'))
      if (path === '/assignments/submissions/student') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected path ${path}`))
    })

    render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/unable to load assignments/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('keeps teacher create workflow available', async () => {
    mockRole = 'teacher'
    mockGet.mockImplementation((path: string) => {
      if (path === '/teachers/me') return Promise.resolve({ data: { id: 'teacher-profile-123' } })
      if (path === '/academic/courses') return Promise.resolve({ data: [] })
      if (path === '/assignments') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected path ${path}`))
    })

    render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /create assignment/i })).toBeInTheDocument()
    expect(screen.getByText('Assignments Portal')).toBeInTheDocument()
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/academic/courses', {
      params: { teacher_id: 'teacher-profile-123' },
    }))
  })
})

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const { mockUser } = vi.hoisted(() => ({
  mockUser: { current: { id: 'teacher-user', role: 'teacher', full_name: 'Assigned Teacher' } },
}))

vi.mock('../../lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}))

vi.mock('../../components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { AttendanceManager } from './AttendanceManager'

const course = {
  id: 'course-123',
  name: 'Data Structure',
  code: 'BCS301',
  department_id: 'cse-id',
  semester: 3,
  teacher_id: 'teacher-profile',
  teacher_name: 'Assigned Teacher',
  subject_type: 'theory',
  is_active: true,
  created_at: '2026-10-09T00:00:00Z',
}
const firstUnassignedCourse = {
  ...course,
  id: 'course-first',
  name: 'Mathematics-IV',
  code: 'BAS303',
  teacher_id: undefined,
  teacher_name: undefined,
}

const initialRoster = {
  course_id: course.id,
  date: '2026-10-09T00:00:00Z',
  summary: { present: 0, absent: 0, late: 0, marked: 0, total_students: 3, coverage: 0 },
  students: [
    { id: 'student-1', student_id: 'student-1', full_name: 'Student One', enrollment_number: 'ENR001', attendance_status: null, attendance_percentage: 80 },
    { id: 'student-2', student_id: 'student-2', full_name: 'Student Two', enrollment_number: 'ENR002', attendance_status: null, attendance_percentage: 60 },
    { id: 'student-3', student_id: 'student-3', full_name: 'Student Three', enrollment_number: 'ENR003', attendance_status: null, attendance_percentage: 100 },
  ],
}

const savedRoster = {
  ...initialRoster,
  summary: { present: 1, absent: 1, late: 1, marked: 3, total_students: 3, coverage: 100 },
  students: initialRoster.students.map((student, index) => ({
    ...student,
    attendance_status: (['present', 'absent', 'late'] as const)[index],
  })),
}

describe('AttendanceManager', () => {
  beforeEach(() => {
    mockUser.current = { id: 'teacher-user', role: 'teacher', full_name: 'Assigned Teacher' }
    mockGet.mockReset()
    mockPost.mockReset()
    mockGet.mockImplementation((url: string) => {
      if (url === '/attendance/courses') return Promise.resolve({ data: [firstUnassignedCourse, course] })
      return Promise.resolve({ data: mockPost.mock.calls.length ? savedRoster : initialRoster })
    })
    mockPost.mockResolvedValue({ data: { message: 'Attendance saved successfully' } })
  })

  it('loads a date roster, saves statuses, and reloads the persisted values', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><AttendanceManager /></MemoryRouter>)

    expect(await screen.findByText('Student One')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Course' })).toHaveValue(firstUnassignedCourse.id)
    expect(screen.getByRole('option', { name: 'BAS303 — Mathematics-IV' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'BCS301 — Data Structure' })).toBeInTheDocument()
    expect(screen.queryByText('Assigned Teacher')).not.toBeInTheDocument()

    const row = screen.getByText('Student One').closest('.rounded-2xl.border')
    expect(row).not.toBeNull()
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'present' }))
    const secondRow = screen.getByText('Student Two').closest('.rounded-2xl.border')
    await user.click(within(secondRow as HTMLElement).getByRole('button', { name: 'absent' }))
    const thirdRow = screen.getByText('Student Three').closest('.rounded-2xl.border')
    await user.click(within(thirdRow as HTMLElement).getByRole('button', { name: 'late' }))

    expect(screen.getByText('100%')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save attendance/i }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/attendance', expect.objectContaining({
      course_id: firstUnassignedCourse.id,
      records: [
        { student_id: 'student-1', status: 'present' },
        { student_id: 'student-2', status: 'absent' },
        { student_id: 'student-3', status: 'late' },
      ],
    })))
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(`/attendance/course/${firstUnassignedCourse.id}/roster`, expect.objectContaining({ params: { date: expect.any(String) } })))
    expect(screen.getAllByRole('button', { name: 'present' }).some((button) => button.getAttribute('aria-pressed') === 'true')).toBe(true)
    expect(mockGet.mock.calls.some(([url, config]) => url === `/attendance/course/${firstUnassignedCourse.id}/roster` && config.params.date)).toBe(true)
  })

  it('loads a student curriculum and personal attendance summary without using the teacher roster endpoint', async () => {
    mockUser.current = { id: 'student-user', role: 'student', full_name: 'Aayush_Singh' }
    const studentSummary = {
      course_id: firstUnassignedCourse.id,
      course_code: firstUnassignedCourse.code,
      course_name: firstUnassignedCourse.name,
      present: 0,
      absent: 0,
      late: 0,
      total_classes: 0,
      attendance_percentage: 0,
      has_records: false,
    }
    mockGet.mockImplementation((url: string) => {
      if (url === '/attendance/student/courses') return Promise.resolve({ data: [firstUnassignedCourse, course] })
      if (url.endsWith('/summary')) return Promise.resolve({ data: studentSummary })
      return Promise.reject(new Error(`Unexpected student attendance API: ${url}`))
    })

    render(<MemoryRouter><AttendanceManager /></MemoryRouter>)

    expect(await screen.findByRole('option', { name: 'BAS303 — Mathematics-IV' })).toBeInTheDocument()
    expect(screen.getByText('No attendance has been recorded for this course yet.')).toBeInTheDocument()
    expect(screen.getByText('Total Classes')).toBeInTheDocument()
    expect(screen.getByText('Attendance Percentage')).toBeInTheDocument()
    expect(screen.queryByText('Attendance courses could not be loaded. Check your access and try again.')).not.toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith('/attendance/student/courses')
    expect(mockGet).toHaveBeenCalledWith(`/attendance/student/courses/${firstUnassignedCourse.id}/summary`)
    expect(mockGet.mock.calls.some(([url]) => String(url).includes('/roster'))).toBe(false)

    const summaryCallsBeforeFocus = mockGet.mock.calls.filter(([url]) => url.endsWith('/summary')).length
    fireEvent.focus(window)
    await waitFor(() => expect(mockGet.mock.calls.filter(([url]) => url.endsWith('/summary')).length).toBeGreaterThan(summaryCallsBeforeFocus))
  })
})

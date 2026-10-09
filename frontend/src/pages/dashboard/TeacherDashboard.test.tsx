import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()

vi.mock('../../lib/api', () => ({ default: { get: (...args: unknown[]) => mockGet(...args) } }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { full_name: 'Prof. Rajesh Sharma' } }) }))
vi.mock('../../components/layout/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => children }))

import { TeacherDashboard } from './TeacherDashboard'

const assignedCourses = [
  { id: 'course-bas101', code: 'BAS101', name: 'Engineering Mathematics-I', semester: 1, credits: null },
  { id: 'course-bas303', code: 'BAS303', name: 'Mathematics-IV', semester: 3, credits: null },
]

describe('TeacherDashboard assigned courses', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockImplementation((path: string) => {
      if (path === '/teachers/me') {
        return Promise.resolve({ data: { id: 'teacher-profile-123', designation: 'Professor', department_name: 'CSE Department' } })
      }
      if (path === '/academic/courses') return Promise.resolve({ data: assignedCourses })
      if (path === '/assignments') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected API path: ${path}`))
    })
  })

  it('requests courses scoped by the real teacher profile and renders only returned assignments', async () => {
    render(<MemoryRouter><TeacherDashboard /></MemoryRouter>)

    expect(await screen.findByText('2')).toBeInTheDocument()
    const courseCodes = screen.getAllByText(/BAS(101|303)/).map((element) => element.textContent)
    expect(courseCodes).toEqual(['BAS101', 'BAS303'])
    expect(screen.getByText('BAS101')).toBeInTheDocument()
    expect(screen.getByText('Engineering Mathematics-I')).toBeInTheDocument()
    expect(screen.getByText('Semester 1')).toBeInTheDocument()
    expect(screen.getByText('BAS303')).toBeInTheDocument()
    expect(screen.getByText('Mathematics-IV')).toBeInTheDocument()
    expect(screen.getByText('Semester 3')).toBeInTheDocument()
    expect(screen.queryByText(/Intro to Testing|Semester Two Course|Applied Testing/i)).not.toBeInTheDocument()
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/academic/courses', {
      params: { teacher_id: 'teacher-profile-123' },
    }))
  })
})

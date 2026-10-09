import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Course } from '../../types'

const mockGet = vi.fn()

vi.mock('../../lib/api', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args), post: vi.fn() },
}))

vi.mock('../../components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => children,
}))

import { Courses } from './Courses'

const courseNames = [
  'Engineering Mathematics-IV',
  'Data Structure',
  'Computer Organization & Architecture',
  'Discrete Structures & Theory of Logic',
  'Python Programming',
  'Universal Human Values & Professional Ethics',
  'Data Structure Lab',
  'Python Programming Lab',
  'Web Designing Workshop',
  'Mini Project',
]

const facultyByName: Record<string, string | null> = {
  'Engineering Mathematics-IV': 'Dr. Nayan Goel Modi',
  'Data Structure': 'Alok Kumar Srivastav',
  'Computer Organization & Architecture': 'Sanjay Gupta',
  'Discrete Structures & Theory of Logic': 'Amit Dubey',
  'Python Programming': 'Jyoti Pandey',
  'Universal Human Values & Professional Ethics': 'SK Madhesiya',
  'Data Structure Lab': null,
  'Python Programming Lab': null,
  'Web Designing Workshop': null,
  'Mini Project': null,
}

const courses: Course[] = courseNames.map((name, index) => ({
  id: `course-${index + 1}`,
  name,
  code: `TEST${index + 1}`,
  department_id: 'cse-department-id',
  department_name: 'Computer Science & Engineering',
  branch: 'CSE',
  credits: null,
  semester: 3,
  teacher_name: facultyByName[name] ?? undefined,
  faculty_name: facultyByName[name],
  subject_type: index < 6 ? 'theory' : index === 8 ? 'workshop' : index === 9 ? 'project' : 'lab',
  is_active: true,
  created_at: '2026-10-09T00:00:00Z',
}))

describe('Courses page', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet
      .mockResolvedValueOnce({ data: [{ id: 'cse-department-id', code: 'CSE', name: 'Computer Science & Engineering' }] })
      .mockResolvedValueOnce({ data: courses })
  })

  it('renders only the active Semester III CSE records returned by the API', async () => {
    render(
      <MemoryRouter>
        <Courses />
      </MemoryRouter>,
    )

    expect(await screen.findByText('10 subjects in view')).toBeInTheDocument()
    for (const name of courseNames) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    expect(screen.queryByText(/Intro to Testing|Semester Two Course|Applied Testing/i)).not.toBeInTheDocument()
    expect(mockGet).toHaveBeenNthCalledWith(2, '/academic/courses', {
      params: { department_id: 'cse-department-id', semester: 3 },
    })
    expect(screen.getAllByText('Not specified')).toHaveLength(10)
    expect(screen.getAllByText('Not assigned')).toHaveLength(8)
  })
})

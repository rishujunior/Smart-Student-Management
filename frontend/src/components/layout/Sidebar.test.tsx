import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const mockUseAuth = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('shows only the permitted navigation items for teacher users', () => {
    mockUseAuth.mockReturnValue({
      user: { full_name: 'Prof. Rajesh Sharma', email: 'prof.sharma@sms.edu', role: 'teacher' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: /students/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /teachers/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /departments/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /results\s*&\s*marks/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link').map((link) => link.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Dashboard',
      'AI Academic AssistantAI',
      'Courses',
      'Attendance',
      'Assignments',
      'Notice Board',
      'Reports',
      'Settings',
    ])
  })

  it.each(['admin', 'student'] as const)('keeps Results & Marks for %s users', (role) => {
    mockUseAuth.mockReturnValue({
      user: { full_name: 'Portal User', email: `${role}@sms.edu`, role },
      logout: vi.fn(),
    })

    render(<MemoryRouter><Sidebar /></MemoryRouter>)

    expect(screen.getByRole('link', { name: /results\s*&\s*marks/i })).toHaveAttribute('href', '/results')
  })
})

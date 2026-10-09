import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const mockUseAuth = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { ProtectedRoute } from './ProtectedRoute'

describe('ProtectedRoute role restrictions', () => {
  it('blocks a teacher from a role-restricted results route', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'teacher' },
      loading: false,
      isAuthenticated: true,
    })

    render(
      <MemoryRouter initialEntries={['/results']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'student']} />}>
            <Route path="/results" element={<div>Results page</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Access denied</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('Results page')).not.toBeInTheDocument()
  })

  it.each(['admin', 'student'] as const)('allows %s on the role-restricted results route', (role) => {
    mockUseAuth.mockReturnValue({
      user: { role },
      loading: false,
      isAuthenticated: true,
    })

    render(
      <MemoryRouter initialEntries={['/results']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'student']} />}>
            <Route path="/results" element={<div>Results page</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Access denied</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Results page')).toBeInTheDocument()
  })
})

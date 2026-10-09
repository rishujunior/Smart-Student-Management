import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { Login } from './Login'

const login = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login }),
}))

describe('Login page', () => {
  beforeEach(() => {
    login.mockReset()
    vi.restoreAllMocks()
  })

  const renderLogin = () =>
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
          <Route path="/forgot-password" element={<div>Forgot password page</div>} />
          <Route path="/register" element={<div>Register page</div>} />
        </Routes>
      </MemoryRouter>,
    )

  it('renders Smart Student Management branding and form fields', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /smart student management/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('admin@sms.edu')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Teacher' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Student' })).toBeInTheDocument()
  })

  it('toggles password visibility without changing the submitted password', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('posts email and password to /auth/login and redirects by role', async () => {
    const user = userEvent.setup()
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        user: { role: 'admin' },
      },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('admin@sms.edu'), 'admin@sms.edu')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Admin@123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@sms.edu',
        password: 'Admin@123',
      }),
    )
    expect(login).toHaveBeenCalledWith('access', 'refresh', { role: 'admin' })
    expect(screen.getByText('Admin dashboard')).toBeInTheDocument()
  })

  it('shows an error alert when login fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'post').mockRejectedValueOnce({
      response: { data: { detail: 'Invalid email or password' } },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('admin@sms.edu'), 'bad@sms.edu')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})

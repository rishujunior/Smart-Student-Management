import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

import { Header } from './Header'

describe('Header theme toggle', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
    document.documentElement.classList.remove('dark', 'light')
  })

  it('switches from dark to light by removing the dark theme class', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
    await user.click(screen.getByRole('button', { name: /switch to light mode/i }))

    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'))
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light')
  })
})

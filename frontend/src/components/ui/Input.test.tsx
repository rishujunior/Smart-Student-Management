import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders a label when provided', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('renders an error message and applies error styling', () => {
    render(<Input label="Password" error="Password is required" />)
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input label="Full Name" onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'Al')
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraduationCap } from 'lucide-react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders title, value and description', () => {
    render(
      <StatCard
        title="Total Students"
        value={248}
        description="Active Enrolled Students"
        icon={GraduationCap}
        color="blue"
      />
    )

    expect(screen.getByText('Total Students')).toBeInTheDocument()
    expect(screen.getByText('248')).toBeInTheDocument()
    expect(screen.getByText('Active Enrolled Students')).toBeInTheDocument()
  })

  it('renders a positive trend indicator', () => {
    render(
      <StatCard
        title="Attendance Rate"
        value="92%"
        icon={GraduationCap}
        trend={{ value: 4, isPositive: true }}
      />
    )

    expect(screen.getByText('+4%')).toBeInTheDocument()
  })

  it('renders a negative trend indicator', () => {
    render(
      <StatCard
        title="Pending Fees"
        value={12}
        icon={GraduationCap}
        trend={{ value: 3, isPositive: false }}
      />
    )

    expect(screen.getByText('-3%')).toBeInTheDocument()
  })
})

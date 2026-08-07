import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

describe('Card', () => {
  it('renders composed card content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Growth</CardTitle>
        </CardHeader>
        <CardContent>Chart goes here</CardContent>
      </Card>
    )

    expect(screen.getByText('Enrollment Growth')).toBeInTheDocument()
    expect(screen.getByText('Chart goes here')).toBeInTheDocument()
  })

  it('merges custom class names onto the root element', () => {
    render(<Card className="custom-class" data-testid="card-root" />)
    expect(screen.getByTestId('card-root')).toHaveClass('custom-class')
  })
})

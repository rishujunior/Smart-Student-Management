import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { Header } from './Header'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'student-user-1',
      full_name: 'Aayush_Singh',
      role: 'student',
    },
  }),
}))

describe('Header notification bell', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('displays notification count badge, opens dropdown, and navigates on click', async () => {
    const user = userEvent.setup()
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: [
        {
          id: 'notif-1',
          title: 'New Assignment',
          message: 'Mathematics Unit 1 Assignment has been posted for Engineering Mathematics-IV.',
          type: 'assignment',
          target_user_id: 'student-user-1',
          assignment_id: 'assign-123',
          course_id: 'course-bas303',
          is_read: false,
          created_by: 'teacher-1',
          created_at: new Date().toISOString(),
        },
      ],
    })
    const putSpy = vi.spyOn(api, 'put').mockResolvedValueOnce({ data: { message: 'Marked as read' } })

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="*"
            element={
              <div>
                <Header />
                <div data-testid="page-content">Current Page</div>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    // Verify GET /notifications was called
    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/notifications'))

    // The bell button should exist
    const bellButton = screen.getByRole('button', { name: /notifications/i })
    expect(bellButton).toBeInTheDocument()

    // Click the bell to open the dropdown
    await user.click(bellButton)

    // Notification dropdown should display the assignment notification
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('1 new')).toBeInTheDocument()
    expect(screen.getByText('Mathematics Unit 1 Assignment has been posted for Engineering Mathematics-IV.')).toBeInTheDocument()

    // Click on the notification item
    const notifItem = screen.getByText('Mathematics Unit 1 Assignment has been posted for Engineering Mathematics-IV.')
    await user.click(notifItem)

    // Should call PUT /notifications/notif-1/read
    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/notifications/notif-1/read'))
  })
})

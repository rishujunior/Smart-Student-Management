import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Pages
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { AdminDashboard } from './pages/dashboard/AdminDashboard'
import { StudentDashboard } from './pages/dashboard/StudentDashboard'
import { TeacherDashboard } from './pages/dashboard/TeacherDashboard'
import { StudentList } from './pages/students/StudentList'
import { TeacherList } from './pages/teachers/TeacherList'
import { Departments } from './pages/academic/Departments'
import { Courses } from './pages/academic/Courses'
import { AttendanceManager } from './pages/attendance/AttendanceManager'
import { ResultManager } from './pages/results/ResultManager'
import { AssignmentList } from './pages/assignments/AssignmentList'
import { AIAssistant } from './pages/ai/AIAssistant'
import { FeeManager } from './pages/fees/FeeManager'
import { NoticeBoard } from './pages/notifications/NoticeBoard'
import { ReportsPage } from './pages/reports/ReportsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/students" element={<StudentList />} />
              <Route path="/teachers" element={<TeacherList />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/attendance" element={<AttendanceManager />} />
              <Route path="/results" element={<ResultManager />} />
              <Route path="/assignments" element={<AssignmentList />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/fees" element={<FeeManager />} />
              <Route path="/notices" element={<NoticeBoard />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

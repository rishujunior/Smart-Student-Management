import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

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
import { SettingsPage } from './pages/settings/SettingsPage'
import { Unauthorized } from './pages/auth/Unauthorized'
import { LandingPage } from './pages/home/LandingPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const routeTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
}

const AnimatedPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={routeTransition.initial}
    animate={routeTransition.animate}
    exit={routeTransition.exit}
    transition={routeTransition.transition}
  >
    {children}
  </motion.div>
)

const AppRoutes: React.FC = () => {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
        <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />
        <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
          <Route path="/student/dashboard" element={<AnimatedPage><StudentDashboard /></AnimatedPage>} />
          <Route path="/teacher/dashboard" element={<AnimatedPage><TeacherDashboard /></AnimatedPage>} />
          <Route path="/students" element={<ProtectedRoute allowedRoles={['admin']}><AnimatedPage><StudentList /></AnimatedPage></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AnimatedPage><TeacherList /></AnimatedPage></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute allowedRoles={['admin']}><AnimatedPage><Departments /></AnimatedPage></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><Courses /></AnimatedPage></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><AttendanceManager /></AnimatedPage></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute allowedRoles={['admin', 'student']}><AnimatedPage><ResultManager /></AnimatedPage></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><AssignmentList /></AnimatedPage></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><AIAssistant /></AnimatedPage></ProtectedRoute>} />
          <Route path="/fees" element={<ProtectedRoute allowedRoles={['admin', 'student']}><AnimatedPage><FeeManager /></AnimatedPage></ProtectedRoute>} />
          <Route path="/notices" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><NoticeBoard /></AnimatedPage></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><ReportsPage /></AnimatedPage></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><AnimatedPage><SettingsPage /></AnimatedPage></ProtectedRoute>} />
        </Route>

        <Route path="/unauthorized" element={<AnimatedPage><Unauthorized /></AnimatedPage>} />

        <Route path="/" element={<AnimatedPage><LandingPage /></AnimatedPage>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

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
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

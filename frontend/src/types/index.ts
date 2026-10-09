export type UserRole = 'admin' | 'teacher' | 'student'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  is_verified: boolean
  avatar?: string
  phone?: string
  created_at: string
}

export interface AuthState {
  user: User | null
  access_token: string | null
  refresh_token: string | null
  isAuthenticated: boolean
}

export interface Student {
  id: string
  user_id: string
  enrollment_number: string
  full_name: string
  email: string
  department_id: string
  department_name?: string
  branch?: string
  semester: number
  batch_year: number
  guardian_name?: string
  guardian_phone?: string
  address?: string
  date_of_birth?: string
  gender?: string
  blood_group?: string
  avatar?: string
  is_active: boolean
  cgpa?: number
  attendance_percentage?: number
  created_at: string
}

export interface Teacher {
  id: string
  user_id: string
  employee_id: string
  full_name: string
  email: string
  department_id: string
  department_name?: string
  designation: string
  qualification?: string
  experience_years?: number
  specialization?: string
  joining_date?: string
  avatar?: string
  is_active: boolean
  created_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  head_teacher_id?: string
  head_teacher_name?: string
  student_count: number
  teacher_count: number
  created_at: string
}

export interface Course {
  id: string
  name: string
  code: string
  department_id: string
  department_name?: string
  credits?: number | null
  semester: number
  description?: string
  teacher_id?: string
  teacher_name?: string
  faculty_name?: string | null
  subject_type?: string | null
  is_active: boolean
  created_at: string
}

export interface Semester {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  student_name?: string
  course_id: string
  course_name?: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  marked_by: string
  created_at: string
}

export interface AttendanceSummary {
  course_id: string
  course_name: string
  total: number
  present: number
  absent: number
  late: number
  percentage: number
}

export interface Result {
  id: string
  student_id: string
  student_name?: string
  course_id: string
  course_name?: string
  semester_id: string
  internal_marks: number
  external_marks: number
  practical_marks?: number
  total_marks: number
  max_marks: number
  percentage: number
  grade: string
  grade_point: number
  is_pass: boolean
  created_at: string
}

export interface CGPAData {
  student_id: string
  student_name: string
  cgpa: number
  total_credits: number
  semester_results: Array<{
    semester_id: string
    gpa: number
    credits: number
    subjects: number
  }>
}

export interface Assignment {
  id: string
  title: string
  description: string
  course_id: string
  course_name?: string
  course_code?: string
  teacher_id: string
  teacher_name?: string
  due_date: string
  total_marks: number
  file_url?: string
  is_active: boolean
  submission_count: number
  has_submitted?: boolean
  student_status?: 'pending' | 'overdue' | 'submitted'
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  assignment_title?: string
  student_id: string
  student_name?: string
  content?: string
  file_url?: string
  submitted_at: string
  is_late: boolean
  marks_obtained?: number
  feedback?: string
  is_graded: boolean
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  target_role?: string
  target_user_id?: string
  assignment_id?: string
  course_id?: string
  department_id?: string
  is_read: boolean
  created_by: string
  created_at: string
}

export interface FeeRecord {
  id: string
  student_id: string
  student_name?: string
  amount: number
  amount_paid: number
  balance: number
  description: string
  due_date: string
  fee_type: string
  payment_status: 'pending' | 'partial' | 'paid'
  payment_date?: string
  transaction_id?: string
  created_at: string
}

export interface DashboardStats {
  overview: {
    total_students: number
    total_teachers: number
    total_departments: number
    total_courses: number
    attendance_rate: number
    pending_fees: number
  }
  department_distribution: Array<{ department: string; count: number; code: string }>
  enrollment_trend: Array<{ month: string; count: number }>
  recent_activities: Array<{ id: string; action: string; description: string; user_id: string; created_at: string }>
}

export interface ApiError {
  detail: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  skip: number
  limit: number
}

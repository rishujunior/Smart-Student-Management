import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  FileText,
  Bot,
  Bell,
  CreditCard,
  Building2,
  FileBarChart,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { cn } from '../../lib/utils'

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth()

  const role = user?.role || 'student'

  const navItems = [
    {
      title: 'Dashboard',
      href: role === 'admin' ? '/admin/dashboard' : role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      title: 'AI Academic Assistant',
      href: '/ai-assistant',
      icon: Bot,
      roles: ['admin', 'teacher', 'student'],
      badge: 'AI',
    },
    {
      title: 'Students',
      href: '/students',
      icon: GraduationCap,
      roles: ['admin', 'teacher'],
    },
    {
      title: 'Teachers',
      href: '/teachers',
      icon: Users,
      roles: ['admin'],
    },
    {
      title: 'Departments',
      href: '/departments',
      icon: Building2,
      roles: ['admin'],
    },
    {
      title: 'Courses',
      href: '/courses',
      icon: BookOpen,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      title: 'Attendance',
      href: '/attendance',
      icon: CalendarCheck,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      title: 'Results & Marks',
      href: '/results',
      icon: Award,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      title: 'Assignments',
      href: '/assignments',
      icon: FileText,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      title: 'Fee Management',
      href: '/fees',
      icon: CreditCard,
      roles: ['admin', 'student'],
    },
    {
      title: 'Notice Board',
      href: '/notices',
      icon: Bell,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: FileBarChart,
      roles: ['admin', 'teacher', 'student'],
    },
  ]

  const filteredItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar-bg p-4 flex flex-col justify-between transition-all duration-300">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-border/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-purple-600 text-primary-foreground shadow-lg shadow-primary/25">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              SmartSMS <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            </h1>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {role} Portal
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'sidebar-item group relative',
                    isActive && 'active'
                  )
                }
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-accent/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

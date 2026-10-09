import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, Search, Sun, Moon, Sparkles, User as UserIcon, Settings, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import type { Notification } from '../../types'

export const Header: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (typeof localStorage !== 'undefined' && (localStorage.getItem('theme') as 'dark' | 'light')) || 'dark'
    } catch {
      return 'dark'
    }
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.remove('light')
  }, [theme])

  useEffect(() => {
    let cancelled = false
    const loadNotifications = async () => {
      try {
        const res = await api.get('/notifications')
        if (!cancelled) setNotifications(res.data || [])
      } catch {
        // Handled silently
      }
    }
    if (user) {
      void loadNotifications()
    }
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', nextTheme)
      }
    } catch {
      // Ignore storage errors in test/restricted environments
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await api.put(`/notifications/${n.id}/read`)
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        )
      } catch {
        // Proceed even if mark as read failed
      }
    }
    setShowNotifications(false)
    if (n.assignment_id) {
      navigate(`/assignments?id=${n.assignment_id}`)
    } else {
      navigate('/notices')
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students, courses, notices..."
            className="w-full rounded-xl border border-input bg-accent/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/ai-assistant')}
          className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all hover:border-purple-500/60 hover:bg-purple-500/15"
        >
          <Sparkles className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
          <span>Ask Gemini AI</span>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          type="button"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Notifications"
            type="button"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-accent/20">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false)
                    navigate('/notices')
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Notice board
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent/40 ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${n.type === 'assignment' ? 'bg-purple-500/15 text-purple-400' : 'bg-primary/15 text-primary'}`}
                      >
                        {n.type === 'assignment' ? (
                          <FileText className="h-3.5 w-3.5" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs truncate ${!n.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
                          <span>{new Date(n.created_at).toLocaleDateString()}</span>
                          {n.assignment_id && (
                            <span className="font-semibold text-primary">Open assignment →</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-foreground">{user?.full_name}</span>
            <span className="text-[11px] font-medium text-muted-foreground capitalize">
              {user?.role}
            </span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-purple-600 text-white font-bold text-sm shadow-md">
            {user?.full_name?.charAt(0) || <UserIcon className="h-4 w-4" />}
          </div>
        </div>
      </div>
    </header>
  )
}

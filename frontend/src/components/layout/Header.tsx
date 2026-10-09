import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, Search, Sun, Moon, Sparkles, User as UserIcon, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const Header: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.remove('light')
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
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

        <button
          onClick={() => navigate('/notices')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
        </button>

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

import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  )
}

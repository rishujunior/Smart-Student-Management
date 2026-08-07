import React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-foreground/80 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-muted-foreground">{icon}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all',
              icon && 'pl-9',
              error && 'border-destructive focus:ring-destructive/50',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateString: string | Date): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getInitials(name: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getGradeBadgeColor(grade: string): string {
  switch (grade) {
    case 'O':
    case 'A+':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'A':
    case 'B+':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'B':
    case 'C':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    default:
      return 'bg-red-500/10 text-red-400 border-red-500/20'
  }
}

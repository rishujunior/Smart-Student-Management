import { describe, expect, it } from 'vitest'
import { cn, formatDate, getGradeBadgeColor, getInitials } from './utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('drops falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, 'baz')).toBe('foo baz')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string as Month Day, Year', () => {
    expect(formatDate('2024-10-15T12:00:00.000Z')).toBe('Oct 15, 2024')
  })

  it('returns an empty string for falsy input', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('getInitials', () => {
  it('builds initials from a full name', () => {
    expect(getInitials('Alice Johnson')).toBe('AJ')
  })

  it('caps initials at two characters for long names', () => {
    expect(getInitials('Rajesh Kumar Sharma')).toBe('RK')
  })

  it('falls back to U for empty input', () => {
    expect(getInitials('')).toBe('U')
  })
})

describe('getGradeBadgeColor', () => {
  it('returns emerald styling for top grades', () => {
    expect(getGradeBadgeColor('O')).toContain('emerald')
    expect(getGradeBadgeColor('A+')).toContain('emerald')
  })

  it('returns red styling for failing grades', () => {
    expect(getGradeBadgeColor('F')).toContain('red')
  })
})

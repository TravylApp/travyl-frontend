'use client'

import { Loader2 } from 'lucide-react'

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
      {children}
    </label>
  )
}

export function Input({
  value, onChange, type = 'text', placeholder, disabled, maxLength, autoFocus, invalid,
  inputMode, min, max, step,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  autoFocus?: boolean
  invalid?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal'
  min?: string | number
  max?: string | number
  step?: string | number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      autoFocus={autoFocus}
      inputMode={inputMode}
      min={min}
      max={max}
      step={step}
      className={`w-full h-11 rounded-xl border bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 transition disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/[0.02] ${
        invalid
          ? 'border-red-400 dark:border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-200 dark:border-white/[0.10] focus:border-[var(--trip-base)]/50'
      }`}
    />
  )
}

export function Select({
  value, onChange, options, disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 focus:border-[var(--trip-base)]/50 transition disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/[0.02]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="dark:bg-gray-900 dark:text-white">{o.label}</option>
      ))}
    </select>
  )
}

export function DateInput(props: {
  value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean;
  min?: string; max?: string;
}) {
  return <Input type="date" {...props} />
}

export function DateTimeInput(props: { value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  return <Input type="datetime-local" {...props} />
}

export function PrimaryButton({
  onClick, disabled, busy, children, type = 'button',
}: {
  onClick?: () => void
  disabled?: boolean
  busy?: boolean
  children: React.ReactNode
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="flex items-center gap-2 px-5 h-11 rounded-xl text-[14px] font-semibold text-white shadow-sm hover:shadow-md transition-all disabled:bg-gray-200 dark:disabled:bg-white/[0.06] disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
      style={!disabled && !busy ? { backgroundColor: 'var(--trip-base)' } : undefined}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

export function SecondaryButton({
  onClick, disabled, children, type = 'button',
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 h-11 rounded-xl text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.10] hover:bg-gray-50 dark:hover:bg-white/[0.08] transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

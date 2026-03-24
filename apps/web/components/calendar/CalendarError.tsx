'use client'

interface CalendarErrorProps {
  message: string
  onBack?: () => void
}

export function CalendarError({ message, onBack }: CalendarErrorProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--cal-bg)] text-[var(--cal-text)]">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="text-red-400"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
          <path
            d="M24 14V26M24 32V34"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm text-[var(--cal-text-secondary)]">{message}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded bg-[var(--cal-border)] hover:bg-[var(--cal-border-light)] transition-colors text-sm font-medium text-[var(--cal-text)]"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  )
}

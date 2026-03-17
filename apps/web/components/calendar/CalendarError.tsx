'use client'

interface CalendarErrorProps {
  message: string
  onBack?: () => void
}

export function CalendarError({ message, onBack }: CalendarErrorProps) {
  const isDark =
    typeof window !== 'undefined' &&
    localStorage.getItem('travyl-calendar-theme') === 'dark'

  return (
    <div
      className={
        'flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0a1520] text-gray-900 dark:text-[#f5efe8]' +
        (isDark ? ' dark' : '')
      }
    >
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
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-white"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  )
}

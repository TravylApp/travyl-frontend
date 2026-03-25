'use client'

interface Props {
  resultCount: number
  isActionMode?: boolean
}

export function SpotlightFooter({ resultCount, isActionMode }: Props) {
  if (isActionMode) {
    return (
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              &larr;
            </kbd>
            <span>Back</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              &uarr;&darr;
            </kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              &crarr;
            </kbd>
            <span>Execute</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            &uarr;&darr;
          </kbd>
          <span>Navigate</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            &rarr;
          </kbd>
          <span>Actions</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            &crarr;
          </kbd>
          <span>Open</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            {'\u2318\u21B5'}
          </kbd>
          <span>New Tab</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            {'\u2318C'}
          </kbd>
          <span>Copy</span>
        </span>
      </div>
      {resultCount > 0 && (
        <span>
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

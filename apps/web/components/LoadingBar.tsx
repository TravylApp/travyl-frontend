'use client'

interface LoadingBarProps {
  isLoading: boolean
}

export function LoadingBar({ isLoading }: LoadingBarProps) {
  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-800 overflow-hidden">
      <div className="h-full bg-[#1e3a5f] animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '30%' }} />
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  )
}

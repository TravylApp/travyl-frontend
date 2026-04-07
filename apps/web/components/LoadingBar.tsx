import { useEffect, useState } from 'react';

interface LoadingBarProps {
  isLoading: boolean;
}

export function LoadingBar({ isLoading }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    setProgress(10);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && progress > 0) {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, progress]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div 
        className="h-1 bg-blue-600 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

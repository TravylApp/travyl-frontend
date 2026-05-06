'use client';

export interface ModuleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Module({ title, description, action, children, className = '' }: ModuleProps) {
  return (
    <section className={`bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4 px-7 lg:px-8 pt-7 lg:pt-8 pb-5 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <h2 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">{title}</h2>
          {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1 px-7 lg:px-8 py-6 lg:py-7">{children}</div>
    </section>
  );
}

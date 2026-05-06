'use client';

export interface ModuleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleSize?: 'lg' | 'sm';
}

export function Module({ title, description, action, children, className = '', titleSize = 'lg' }: ModuleProps) {
  const titleClass = titleSize === 'sm'
    ? 'text-[17px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight'
    : 'text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight';
  const headerPadClass = titleSize === 'sm'
    ? 'flex items-start justify-between gap-4 px-5 lg:px-6 pt-5 lg:pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]'
    : 'flex items-start justify-between gap-4 px-7 lg:px-8 pt-7 lg:pt-8 pb-5 border-b border-gray-100 dark:border-white/[0.06]';
  const bodyPadClass = titleSize === 'sm'
    ? 'flex-1 px-5 lg:px-6 py-5 lg:py-6'
    : 'flex-1 px-7 lg:px-8 py-6 lg:py-7';

  return (
    <section className={`bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col ${className}`}>
      <header className={headerPadClass}>
        <div>
          <h2 className={titleClass}>{title}</h2>
          {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
        </div>
        {action}
      </header>
      <div className={bodyPadClass}>{children}</div>
    </section>
  );
}

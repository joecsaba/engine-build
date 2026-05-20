interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, action }: PageHeaderProps) {
  return (
    <div className="w-full bg-[#1a1a1a] text-white">
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            {eyebrow && (
              <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-2">{eyebrow}</p>
            )}
            <h1 className="text-4xl font-bold tracking-tight leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-gray-400 mt-2 text-lg max-w-2xl leading-relaxed">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}

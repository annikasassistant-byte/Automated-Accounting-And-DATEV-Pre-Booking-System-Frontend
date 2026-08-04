interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {description && (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

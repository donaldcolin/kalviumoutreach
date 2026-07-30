import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-card border border-border border-dashed rounded-2xl animate-in fade-in duration-500 min-h-[300px]">
      <div className="w-16 h-16 bg-secondary border border-border rounded-2xl flex items-center justify-center mb-5 shadow-sm">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight text-center">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] text-center mb-6">{description}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-2xl animate-in fade-in duration-700 min-h-[300px] relative overflow-hidden shadow-sm">
      {/* Premium subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-100 rounded-2xl blur-xl opacity-50 transform scale-110" />
          <div className="relative w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Icon className="w-7 h-7 text-gray-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight text-center">{title}</h3>
        <p className="text-[15px] text-gray-500 max-w-[320px] text-center mb-6 leading-relaxed">{description}</p>
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

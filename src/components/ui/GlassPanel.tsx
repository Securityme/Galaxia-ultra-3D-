import React from 'react';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0b1322]/85 backdrop-blur-xl border border-amber-200/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] rounded-2xl text-slate-100 ${className}`}
    >
      {children}
    </div>
  );
};

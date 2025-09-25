import React from 'react';

const variantClasses = {
    default: "border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/80",
    secondary: "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80",
    destructive: "border-transparent bg-red-500 text-neutral-50 hover:bg-red-500/80",
    outline: "text-neutral-950",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = "default", ...props }) => {
  const baseClasses = "inline-flex items-center rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`} {...props} />
  );
}
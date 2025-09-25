import React, { useEffect } from 'react';

const variantClasses = {
  default: "bg-neutral-900 text-white",
  destructive: "bg-red-600 text-white",
};

export interface ToastProps {
  message: string;
  variant?: keyof typeof variantClasses;
  duration?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, variant = 'default', duration = 3000, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onDismiss]);

  return (
    <div className={`flex items-center justify-between gap-4 p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 font-display ${variantClasses[variant]}`}>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/20">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
};
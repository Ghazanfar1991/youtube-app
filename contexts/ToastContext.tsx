import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { Toast, ToastProps } from '../components/ui/Toast';

interface ToastMessage extends Omit<ToastProps, 'onDismiss'> {
  id: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const newToast = { ...toast, id: Date.now() };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

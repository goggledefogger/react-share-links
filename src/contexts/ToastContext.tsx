import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (toast: Toast) => void;
  toast: Toast | null;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (newToast: Toast) => {
    setToast(newToast);
    setTimeout(() => setToast(null), 3000); // Hide after 3 seconds
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

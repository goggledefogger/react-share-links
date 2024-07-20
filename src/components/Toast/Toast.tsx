import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import './Toast.css';

const Toast: React.FC = () => {
  const { toast } = useToast();

  if (!toast) return null;

  return <div className={`toast ${toast.type}`}>{toast.message}</div>;
};

export default Toast;

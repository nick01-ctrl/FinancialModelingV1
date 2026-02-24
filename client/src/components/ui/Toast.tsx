import { useState, useEffect, useCallback } from 'react';

interface ToastState {
  message: string;
  visible: boolean;
}

let showToastFn: ((message: string) => void) | null = null;

export function showToast(message: string) {
  showToastFn?.(message);
}

export default function Toast() {
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  const show = useCallback((message: string) => {
    setToast({ message, visible: true });
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => { showToastFn = null; };
  }, [show]);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  if (!toast.visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1e293b',
      color: 'white',
      padding: '0.625rem 1.25rem',
      borderRadius: '8px',
      fontSize: '0.85rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      animation: 'toast-in 0.2s ease-out',
    }}>
      {toast.message}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

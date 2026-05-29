import React, { useState, createContext, useContext, useCallback, useRef } from 'react';

/* ============================================
   Toast Notification System
   ============================================ */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const iconMap: Record<ToastType, string> = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
  };

  const colorMap: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', color: '#059669' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          const c = colorMap[toast.type];
          return (
            <div key={toast.id} style={{
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '10px', minWidth: '260px', maxWidth: '400px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)', pointerEvents: 'auto',
              animation: 'toastSlideIn 0.3s ease-out',
              fontFamily: "'Inter', sans-serif"
            }}>
              <i className={iconMap[toast.type]} style={{ fontSize: '16px', flexShrink: 0 }}></i>
              <span style={{ lineHeight: 1.4 }}>{toast.message}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};


/* ============================================
   Confirm Dialog System
   ============================================ */

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: async () => false });

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirmFn = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolveRef.current?.(false);
  };

  const variantConfig: Record<ConfirmVariant, { icon: string; iconBg: string; iconColor: string; btnBg: string }> = {
    danger:  { icon: 'fas fa-trash-alt', iconBg: '#fef2f2', iconColor: '#dc2626', btnBg: '#dc2626' },
    warning: { icon: 'fas fa-exclamation-triangle', iconBg: '#fffbeb', iconColor: '#d97706', btnBg: '#d97706' },
    info:    { icon: 'fas fa-info-circle', iconBg: '#eff6ff', iconColor: '#2563eb', btnBg: '#2563eb' },
  };

  const v = options?.variant || 'danger';
  const cfg = variantConfig[v];

  return (
    <ConfirmContext.Provider value={{ confirm: confirmFn }}>
      {children}

      {isOpen && options && (
        <div onClick={handleCancel} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '90%',
            textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            animation: 'confirmIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontFamily: "'Inter', sans-serif"
          }}>
            {/* Icon */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '22px',
              background: cfg.iconBg, color: cfg.iconColor, margin: '0 auto 16px'
            }}>
              <i className={cfg.icon}></i>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              {options.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '24px' }}>
              {options.message}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={handleCancel} style={{
                padding: '9px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '10px',
                border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer',
                transition: 'all 0.15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}>
                {options.cancelText || 'Cancel'}
              </button>
              <button onClick={handleConfirm} style={{
                padding: '9px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '10px',
                border: 'none', background: cfg.btnBg, color: '#fff', cursor: 'pointer',
                transition: 'all 0.15s ease', boxShadow: `0 2px 8px ${cfg.btnBg}33`
              }}>
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
};

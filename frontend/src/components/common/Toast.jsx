import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toasts = [], onDismiss }) => {
  if (!toasts.length) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#34d399" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle size={18} color="#fbbf24" aria-hidden="true" />;
      case 'error':
        return <AlertCircle size={18} color="#f87171" aria-hidden="true" />;
      default:
        return <Info size={18} color="#38bdf8" aria-hidden="true" />;
    }
  };

  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass-panel-elevated toast-item toast-item--${toast.type || 'info'}`}
          role="status"
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon(toast.type)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {toast.title}
              </h5>
            )}
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="icon-action-btn"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;

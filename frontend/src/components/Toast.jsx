import { useWebSocket } from '../context/WebSocketContext.jsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useWebSocket();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isAlert = toast.type === 'alert';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`toast ${isAlert ? 'toast-alert' : isSuccess ? 'toast-success' : ''}`}
          >
            <div style={{ color: isAlert ? '#ef4444' : isSuccess ? '#10b981' : '#3b82f6', flexShrink: 0 }}>
              {isAlert ? <AlertCircle size={20} /> : isSuccess ? <CheckCircle2 size={20} /> : <Info size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: '2px' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

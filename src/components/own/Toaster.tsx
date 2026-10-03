import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToastContext, type ToastKind } from './toast-context';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, message, kind }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <div
              key={toast.id}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={cn(
                'flex items-start gap-3 rounded-xl border bg-popover/95 backdrop-blur-md px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2',
                toast.kind === 'error' && 'border-destructive/40',
                toast.kind === 'success' && 'border-primary/40',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 mt-0.5 shrink-0',
                  toast.kind === 'error' ? 'text-destructive' : toast.kind === 'success' ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <p className="flex-1 text-popover-foreground leading-snug">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

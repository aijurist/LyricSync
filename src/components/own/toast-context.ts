import { createContext, useContext } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastApi>({ show: () => {} });

export const useToast = () => useContext(ToastContext);

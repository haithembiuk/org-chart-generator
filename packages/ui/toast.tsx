import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Match animation duration
  }, [toast.id, onRemove])

  useEffect(() => {
    const duration = toast.duration ?? 4000
    timerRef.current = setTimeout(handleRemove, duration)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [toast.duration, handleRemove])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  }

  const bgColors = {
    success: 'bg-green-900/90 border-green-700/50',
    error: 'bg-red-900/90 border-red-700/50',
    info: 'bg-blue-900/90 border-blue-700/50'
  }

  const textColors = {
    success: 'text-green-100',
    error: 'text-red-100',
    info: 'text-blue-100'
  }

  return (
    <div
      className={`
        flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm
        ${bgColors[toast.type]}
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
      role="alert"
    >
      {icons[toast.type]}
      <span className={`flex-1 text-sm font-medium ${textColors[toast.type]}`}>
        {toast.message}
      </span>
      <button
        onClick={handleRemove}
        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Toast container - fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse space-y-reverse space-y-2 max-w-sm">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes toast-enter {
          0% {
            opacity: 0;
            transform: translateX(100%);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes toast-exit {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        .animate-toast-enter {
          animation: toast-enter 0.3s ease-out forwards;
        }

        .animate-toast-exit {
          animation: toast-exit 0.3s ease-in forwards;
        }
      `}</style>
    </ToastContext.Provider>
  )
}

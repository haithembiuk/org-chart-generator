import React from 'react'
import { ChevronDown, BarChart3, Users, Upload, Plus, X, Network } from 'lucide-react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-800 focus:ring-slate-500 border border-slate-700 hover:border-slate-600',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-500',
  }

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export interface HeaderProps {
  title?: string
}

export const Header: React.FC<HeaderProps> = ({ title = 'OrgChart' }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-screen-2xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Network className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                {title}
              </h1>
              <p className="text-xs text-slate-500">Organization Visualizer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
              v1.0
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export interface ChartViewerPlaceholderProps {
  className?: string
}

export const ChartViewerPlaceholder: React.FC<ChartViewerPlaceholderProps> = ({ className = '' }) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 ${className}`}>
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative flex flex-col items-center justify-center py-24 px-8">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl">
          <Network className="h-10 w-10 text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Chart Data</h3>
        <p className="text-slate-400 text-center max-w-sm mb-8">
          Import a CSV or Excel file to visualize your organization structure
        </p>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <span>CSV</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span>XLSX</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ChartViewer, ChartTooltip } from './chart-viewer'
export type { ChartViewerProps, ChartTooltipProps, ChartNode } from './chart-viewer'
export { AddEmployeeModal } from './add-employee-modal'
export type { AddEmployeeModalProps } from './add-employee-modal'
export { ToastProvider, useToast } from './toast'
export type { Toast, ToastType } from './toast'

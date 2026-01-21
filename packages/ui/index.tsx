import React from 'react'
import { ChevronDown, BarChart3, Users, Upload, Plus, X } from 'lucide-react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border'
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-blue-600 shadow-lg hover:shadow-xl disabled:from-gray-600 disabled:to-gray-700 disabled:border-gray-600',
    secondary: 'bg-gray-800/80 text-gray-100 hover:bg-gray-700/80 border-gray-600 shadow-md hover:shadow-lg disabled:bg-gray-800/50 disabled:border-gray-700 disabled:text-gray-500',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]}`}
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

export const Header: React.FC<HeaderProps> = ({ title = 'HPS ORG Chat Visualizer' }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-md shadow-xl border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-xl shadow-2xl ring-2 ring-blue-400/20 animate-pulse">
              <BarChart3 className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-black text-orange-400 tracking-tight transform hover:scale-105 transition-all duration-300 filter drop-shadow-lg hover:text-red-500">
              {title}
            </h1>
            <div className="p-3 bg-gradient-to-br from-pink-600 via-purple-600 to-blue-500 rounded-xl shadow-2xl ring-2 ring-purple-400/20 animate-pulse" style={{animationDelay: '0.5s'}}>
              <Users className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
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
    <div className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-2 border-dashed border-gray-600/60 rounded-xl p-8 text-center ${className}`}>
      <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-full flex items-center justify-center shadow-lg border border-gray-700/30">
        <Users className="w-12 h-12 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-100 mb-2 tracking-tight">Organization Chart Preview</h3>
      <p className="text-gray-400 mb-6 font-medium">Your generated chart will appear here</p>
      <div className="flex justify-center space-x-2">
        <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-pulse"></div>
        <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
        <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-pink-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
      </div>
    </div>
  )
}

export { ChartViewer, ChartTooltip } from './chart-viewer'
export type { ChartViewerProps, ChartTooltipProps, ChartNode } from './chart-viewer'
export { AddEmployeeModal } from './add-employee-modal'
export type { AddEmployeeModalProps } from './add-employee-modal'
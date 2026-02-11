import React, { useState } from 'react'
import { Employee } from '../shared'
import { X, UserPlus, ChevronDown } from 'lucide-react'

export interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (employee: {
    name: string
    title: string
    managerId?: string | null
  }) => void
  availableManagers: Employee[]
  organizationId: string
  isLoading?: boolean
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableManagers,
  organizationId,
  isLoading = false
}) => {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [managerId, setManagerId] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && title.trim()) {
      onSubmit({
        name: name.trim(),
        title: title.trim(),
        managerId: managerId || null
      })
      
      // Reset form
      setName('')
      setTitle('')
      setManagerId(null)
    }
  }

  const handleClose = () => {
    setName('')
    setTitle('')
    setManagerId(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface/95 backdrop-blur-md rounded-xl shadow-2xl max-w-md w-full mx-4 border border-border-default">
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight">Add New Employee</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-elevated rounded-lg transition-all duration-200"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="employee-name" className="block text-sm font-semibold text-text-primary mb-2 tracking-tight">
                Name *
              </label>
              <input
                id="employee-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-elevated border border-border-default rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 backdrop-blur-sm font-medium text-text-primary placeholder-text-muted"
                placeholder="Enter employee name"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="employee-title" className="block text-sm font-semibold text-text-primary mb-2 tracking-tight">
                Title *
              </label>
              <input
                id="employee-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-elevated border border-border-default rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 backdrop-blur-sm font-medium text-text-primary placeholder-text-muted"
                placeholder="Enter job title"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="employee-manager" className="block text-sm font-semibold text-text-primary mb-2 tracking-tight">
                Manager (Optional)
              </label>
              <div className="relative">
                <select
                  id="employee-manager"
                  value={managerId || ''}
                  onChange={(e) => setManagerId(e.target.value || null)}
                  className="w-full px-4 py-3 bg-elevated border border-border-default rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 backdrop-blur-sm font-medium appearance-none text-text-primary"
                  disabled={isLoading}
                >
                  <option value="">No manager (Top level)</option>
                  {availableManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} - {manager.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-border-default">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-sm font-semibold text-text-secondary bg-elevated border border-border-default rounded-lg hover:bg-overlay focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-all duration-200 backdrop-blur-sm shadow-sm"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 border border-indigo-600 rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
              disabled={isLoading || !name.trim() || !title.trim()}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Adding...
                </div>
              ) : (
                <div className="flex items-center">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
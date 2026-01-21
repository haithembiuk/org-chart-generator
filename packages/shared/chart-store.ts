import { create } from 'zustand'
import { Employee } from './index'

export interface ChartData {
  employees: Employee[]
  hierarchy: any
  rootEmployees: Employee[]
  orphanedEmployees: Employee[]
  columnIdentification: {
    nameColumn: number
    managerColumn: number | null
    confidence: number
    analysis: string
  }
  validation: {
    isValid: boolean
    issues: string[]
  }
  statistics: {
    totalEmployees: number
    rootEmployees: number
    orphanedEmployees: number
    totalErrors: number
  }
}

interface ChartState {
  chartData: ChartData | null
  isLoading: boolean
  error: string | null
  fileUrl: string | null
  fileName: string | null
  isSaving: boolean
  saveError: string | null
  
  // Actions
  setChartData: (data: ChartData) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFileInfo: (fileUrl: string, fileName: string) => void
  clearChart: () => void
  updateEmployeeManager: (employeeId: string, newManagerId: string | null) => void
  updateEmployee: (employeeId: string, updatedData: { name: string; title: string }) => void
  addEmployee: (employee: Employee) => void
  setSaving: (saving: boolean) => void
  setSaveError: (error: string | null) => void
}

export const useChartStore = create<ChartState>((set, get) => ({
  chartData: null,
  isLoading: false,
  error: null,
  fileUrl: null,
  fileName: null,
  isSaving: false,
  saveError: null,
  
  setChartData: (data) => set({ chartData: data, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setFileInfo: (fileUrl, fileName) => set({ fileUrl, fileName }),
  setSaving: (saving) => set({ isSaving: saving, saveError: saving ? null : get().saveError }),
  setSaveError: (error) => set({ saveError: error, isSaving: false }),
  clearChart: () => set({ 
    chartData: null, 
    error: null, 
    isLoading: false,
    fileUrl: null,
    fileName: null,
    isSaving: false,
    saveError: null
  }),
  updateEmployeeManager: (employeeId, newManagerId) => {
    const currentState = get()
    if (!currentState.chartData) return
    
    const updatedEmployees = currentState.chartData.employees.map(emp => 
      emp.id === employeeId ? { ...emp, managerId: newManagerId } : emp
    )
    
    // Recalculate derived data
    const rootEmployees = updatedEmployees.filter(emp => !emp.managerId)
    const orphanedEmployees = updatedEmployees.filter(emp => {
      if (!emp.managerId) return false
      return !updatedEmployees.some(manager => manager.id === emp.managerId)
    })
    
    const updatedChartData: ChartData = {
      ...currentState.chartData,
      employees: updatedEmployees,
      rootEmployees,
      orphanedEmployees,
      statistics: {
        ...currentState.chartData.statistics,
        totalEmployees: updatedEmployees.length,
        rootEmployees: rootEmployees.length,
        orphanedEmployees: orphanedEmployees.length
      }
    }
    
    set({ chartData: updatedChartData })
  },
  
  updateEmployee: (employeeId, updatedData) => {
    const currentState = get()
    if (!currentState.chartData) return
    
    const updatedEmployees = currentState.chartData.employees.map(emp => 
      emp.id === employeeId ? { ...emp, name: updatedData.name, title: updatedData.title } : emp
    )
    
    // Recalculate derived data (no changes needed for rootEmployees/orphanedEmployees since we're only updating name/title)
    const updatedChartData: ChartData = {
      ...currentState.chartData,
      employees: updatedEmployees
    }
    
    set({ chartData: updatedChartData })
  },
  
  addEmployee: (employee) => {
    const currentState = get()
    if (!currentState.chartData) return
    
    const updatedEmployees = [...currentState.chartData.employees, employee]
    
    // Recalculate derived data
    const rootEmployees = updatedEmployees.filter(emp => !emp.managerId)
    const orphanedEmployees = updatedEmployees.filter(emp => {
      if (!emp.managerId) return false
      return !updatedEmployees.some(manager => manager.id === emp.managerId)
    })
    
    const updatedChartData: ChartData = {
      ...currentState.chartData,
      employees: updatedEmployees,
      rootEmployees,
      orphanedEmployees,
      statistics: {
        ...currentState.chartData.statistics,
        totalEmployees: updatedEmployees.length,
        rootEmployees: rootEmployees.length,
        orphanedEmployees: orphanedEmployees.length
      }
    }
    
    set({ chartData: updatedChartData })
  }
}))
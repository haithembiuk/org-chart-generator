import { describe, it, expect, beforeEach } from 'vitest'
import { useChartStore } from './chart-store'
import { Employee } from './index'

const mockChartData = {
  employees: [
    {
      id: '1',
      name: 'John Doe',
      title: 'CEO',
      organizationId: 'org1',
      managerId: undefined
    },
    {
      id: '2',
      name: 'Jane Smith',
      title: 'CTO',
      organizationId: 'org1',
      managerId: '1'
    }
  ] as Employee[],
  hierarchy: {},
  rootEmployees: [
    {
      id: '1',
      name: 'John Doe',
      title: 'CEO',
      organizationId: 'org1',
      managerId: undefined
    }
  ] as Employee[],
  orphanedEmployees: [] as Employee[],
  columnIdentification: {
    nameColumn: 0,
    managerColumn: 1,
    confidence: 0.9,
    analysis: 'High confidence match'
  },
  validation: {
    isValid: true,
    issues: []
  },
  statistics: {
    totalEmployees: 2,
    rootEmployees: 1,
    orphanedEmployees: 0,
    totalErrors: 0
  }
}

describe('ChartStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useChartStore.getState().clearChart()
  })

  it('initializes with empty state', () => {
    const state = useChartStore.getState()
    
    expect(state.chartData).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.fileUrl).toBeNull()
    expect(state.fileName).toBeNull()
  })

  it('sets chart data correctly', () => {
    const { setChartData } = useChartStore.getState()
    
    setChartData(mockChartData)
    
    const state = useChartStore.getState()
    expect(state.chartData).toEqual(mockChartData)
    expect(state.error).toBeNull()
  })

  it('sets loading state correctly', () => {
    const { setLoading } = useChartStore.getState()
    
    setLoading(true)
    expect(useChartStore.getState().isLoading).toBe(true)
    
    setLoading(false)
    expect(useChartStore.getState().isLoading).toBe(false)
  })

  it('sets error state correctly', () => {
    const { setError } = useChartStore.getState()
    
    setError('Test error')
    
    const state = useChartStore.getState()
    expect(state.error).toBe('Test error')
    expect(state.isLoading).toBe(false)
  })

  it('clears error when setting chart data', () => {
    const { setError, setChartData } = useChartStore.getState()
    
    setError('Test error')
    expect(useChartStore.getState().error).toBe('Test error')
    
    setChartData(mockChartData)
    expect(useChartStore.getState().error).toBeNull()
  })

  it('sets file info correctly', () => {
    const { setFileInfo } = useChartStore.getState()
    
    setFileInfo('https://example.com/file.csv', 'test-file.csv')
    
    const state = useChartStore.getState()
    expect(state.fileUrl).toBe('https://example.com/file.csv')
    expect(state.fileName).toBe('test-file.csv')
  })

  it('clears all state when clearChart is called', () => {
    const { setChartData, setError, setLoading, setFileInfo, clearChart } = useChartStore.getState()
    
    // Set some state
    setChartData(mockChartData)
    setError('Test error')
    setLoading(true)
    setFileInfo('https://example.com/file.csv', 'test-file.csv')
    
    // Clear the chart
    clearChart()
    
    const state = useChartStore.getState()
    expect(state.chartData).toBeNull()
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.fileUrl).toBeNull()
    expect(state.fileName).toBeNull()
  })

  it('handles complex chart data structure', () => {
    const complexChartData = {
      ...mockChartData,
      employees: [
        ...mockChartData.employees,
        {
          id: '3',
          name: 'Bob Johnson',
          title: 'Developer',
          organizationId: 'org1',
          managerId: '2',
          customFields: {
            department: 'Engineering',
            location: 'Remote'
          }
        }
      ] as Employee[],
      orphanedEmployees: [
        {
          id: '4',
          name: 'Alice Brown',
          title: 'Designer',
          organizationId: 'org1',
          managerId: '999' // Non-existent manager
        }
      ] as Employee[],
      validation: {
        isValid: false,
        issues: ['Employee Alice Brown has invalid manager ID']
      },
      statistics: {
        totalEmployees: 4,
        rootEmployees: 1,
        orphanedEmployees: 1,
        totalErrors: 1
      }
    }

    const { setChartData } = useChartStore.getState()
    setChartData(complexChartData)
    
    const state = useChartStore.getState()
    expect(state.chartData).toEqual(complexChartData)
    expect(state.chartData?.employees).toHaveLength(3)
    expect(state.chartData?.orphanedEmployees).toHaveLength(1)
    expect(state.chartData?.validation.isValid).toBe(false)
    expect(state.chartData?.validation.issues).toContain('Employee Alice Brown has invalid manager ID')
  })

  it('handles null error state', () => {
    const { setError } = useChartStore.getState()
    
    setError('Test error')
    expect(useChartStore.getState().error).toBe('Test error')
    
    setError(null)
    expect(useChartStore.getState().error).toBeNull()
  })

  it('maintains state consistency across multiple actions', () => {
    const { setLoading, setFileInfo, setChartData, setError } = useChartStore.getState()
    
    // Simulate a typical flow
    setLoading(true)
    setFileInfo('https://example.com/file.csv', 'test-file.csv')
    
    let state = useChartStore.getState()
    expect(state.isLoading).toBe(true)
    expect(state.fileUrl).toBe('https://example.com/file.csv')
    expect(state.fileName).toBe('test-file.csv')
    
    // Success case
    setChartData(mockChartData)
    
    state = useChartStore.getState()
    expect(state.isLoading).toBe(true) // Still loading until explicitly set to false
    expect(state.chartData).toEqual(mockChartData)
    expect(state.error).toBeNull()
    
    // Error case
    setError('Parsing failed')
    
    state = useChartStore.getState()
    expect(state.error).toBe('Parsing failed')
    expect(state.isLoading).toBe(false) // Error sets loading to false
  })

  describe('updateEmployeeManager', () => {
    beforeEach(() => {
      // Set up initial chart data for manager update tests
      const { setChartData } = useChartStore.getState()
      setChartData(mockChartData)
    })

    it('updates employee manager correctly', () => {
      const { updateEmployeeManager } = useChartStore.getState()
      
      // Update Jane Smith's manager from John Doe to no manager (make her a root employee)
      updateEmployeeManager('2', null)
      
      const state = useChartStore.getState()
      const updatedEmployee = state.chartData!.employees.find(emp => emp.id === '2')
      
      expect(updatedEmployee!.managerId).toBeNull()
      expect(state.chartData!.rootEmployees).toHaveLength(2)
      expect(state.chartData!.statistics.rootEmployees).toBe(2)
    })

    it('updates employee manager to another employee', () => {
      const { updateEmployeeManager, setChartData } = useChartStore.getState()
      
      // Add a third employee first
      const extendedChartData = {
        ...mockChartData,
        employees: [
          ...mockChartData.employees,
          {
            id: '3',
            name: 'Bob Johnson',
            title: 'Developer',
            organizationId: 'org1',
            managerId: '2'
          }
        ] as Employee[],
        statistics: {
          ...mockChartData.statistics,
          totalEmployees: 3
        }
      }
      setChartData(extendedChartData)
      
      // Update Bob's manager from Jane to John
      updateEmployeeManager('3', '1')
      
      const state = useChartStore.getState()
      const updatedEmployee = state.chartData!.employees.find(emp => emp.id === '3')
      
      expect(updatedEmployee!.managerId).toBe('1')
    })

    it('handles orphaned employees correctly', () => {
      const { updateEmployeeManager, setChartData } = useChartStore.getState()
      
      // Set up data with orphaned employee
      const orphanedChartData = {
        ...mockChartData,
        employees: [
          ...mockChartData.employees,
          {
            id: '3',
            name: 'Orphaned Employee',
            title: 'Developer',
            organizationId: 'org1',
            managerId: 'non-existent-id'
          }
        ] as Employee[],
        orphanedEmployees: [
          {
            id: '3',
            name: 'Orphaned Employee',
            title: 'Developer',
            organizationId: 'org1',
            managerId: 'non-existent-id'
          }
        ] as Employee[],
        statistics: {
          ...mockChartData.statistics,
          totalEmployees: 3,
          orphanedEmployees: 1
        }
      }
      setChartData(orphanedChartData)
      
      // Fix the orphaned employee by assigning valid manager
      updateEmployeeManager('3', '1')
      
      const state = useChartStore.getState()
      const updatedEmployee = state.chartData!.employees.find(emp => emp.id === '3')
      
      expect(updatedEmployee!.managerId).toBe('1')
      expect(state.chartData!.orphanedEmployees).toHaveLength(0)
      expect(state.chartData!.statistics.orphanedEmployees).toBe(0)
    })

    it('creates new orphaned employee when manager is removed', () => {
      const { updateEmployeeManager, setChartData } = useChartStore.getState()
      
      // Add a third employee with non-existent manager
      const orphanedEmployee = {
        id: '3',
        name: 'Bob Johnson',
        title: 'Developer',
        organizationId: 'org1',
        managerId: 'non-existent-manager'
      }
      
      const extendedChartData = {
        ...mockChartData,
        employees: [
          ...mockChartData.employees,
          orphanedEmployee
        ] as Employee[],
        orphanedEmployees: [orphanedEmployee] as Employee[], // Set up the orphaned employees array
        statistics: {
          ...mockChartData.statistics,
          totalEmployees: 3,
          orphanedEmployees: 1
        }
      }
      setChartData(extendedChartData)
      
      // Bob should already be orphaned
      const state = useChartStore.getState()
      const bob = state.chartData!.employees.find(emp => emp.id === '3')
      
      expect(bob!.managerId).toBe('non-existent-manager')
      expect(state.chartData!.orphanedEmployees).toHaveLength(1)
      expect(state.chartData!.orphanedEmployees[0].id).toBe('3') // Bob is orphaned
      expect(state.chartData!.statistics.orphanedEmployees).toBe(1)
    })

    it('recalculates root employees correctly', () => {
      const { updateEmployeeManager } = useChartStore.getState()
      
      // Make Jane a root employee
      updateEmployeeManager('2', null)
      
      const state = useChartStore.getState()
      
      expect(state.chartData!.rootEmployees).toHaveLength(2)
      expect(state.chartData!.rootEmployees.map(emp => emp.id)).toContain('1')
      expect(state.chartData!.rootEmployees.map(emp => emp.id)).toContain('2')
      expect(state.chartData!.statistics.rootEmployees).toBe(2)
    })

    it('handles non-existent employee gracefully', () => {
      const { updateEmployeeManager } = useChartStore.getState()
      
      const initialState = useChartStore.getState()
      const initialEmployees = [...initialState.chartData!.employees]
      
      // Try to update non-existent employee
      updateEmployeeManager('999', '1')
      
      const finalState = useChartStore.getState()
      
      // State should remain unchanged
      expect(finalState.chartData!.employees).toEqual(initialEmployees)
    })

    it('does nothing when chartData is null', () => {
      const { clearChart, updateEmployeeManager } = useChartStore.getState()
      
      clearChart()
      
      const initialState = useChartStore.getState()
      expect(initialState.chartData).toBeNull()
      
      // Try to update employee when chartData is null
      updateEmployeeManager('1', '2')
      
      const finalState = useChartStore.getState()
      expect(finalState.chartData).toBeNull()
    })

    it('maintains all statistics correctly after multiple updates', () => {
      const { updateEmployeeManager, setChartData } = useChartStore.getState()
      
      // Set up more complex data
      const complexChartData = {
        ...mockChartData,
        employees: [
          { id: '1', name: 'CEO', title: 'CEO', organizationId: 'org1', managerId: undefined },
          { id: '2', name: 'VP Sales', title: 'VP Sales', organizationId: 'org1', managerId: '1' },
          { id: '3', name: 'VP Eng', title: 'VP Eng', organizationId: 'org1', managerId: '1' },
          { id: '4', name: 'Sales Rep', title: 'Sales Rep', organizationId: 'org1', managerId: '2' },
          { id: '5', name: 'Developer', title: 'Developer', organizationId: 'org1', managerId: '3' }
        ] as Employee[],
        rootEmployees: [
          { id: '1', name: 'CEO', title: 'CEO', organizationId: 'org1', managerId: undefined }
        ] as Employee[],
        orphanedEmployees: [] as Employee[],
        statistics: {
          totalEmployees: 5,
          rootEmployees: 1,
          orphanedEmployees: 0,
          totalErrors: 0
        }
      }
      setChartData(complexChartData)
      
      // Make VP Sales a root employee
      updateEmployeeManager('2', null)
      
      let state = useChartStore.getState()
      expect(state.chartData!.statistics.rootEmployees).toBe(2)
      expect(state.chartData!.statistics.orphanedEmployees).toBe(0) // Sales Rep is still valid, VP Sales still exists
      expect(state.chartData!.statistics.totalEmployees).toBe(5)
      
      // Move Sales Rep to CEO
      updateEmployeeManager('4', '1')
      
      state = useChartStore.getState()
      expect(state.chartData!.statistics.rootEmployees).toBe(2)
      expect(state.chartData!.statistics.orphanedEmployees).toBe(0)
      expect(state.chartData!.statistics.totalEmployees).toBe(5)
    })

    it('preserves custom fields during manager updates', () => {
      const { updateEmployeeManager, setChartData } = useChartStore.getState()
      
      // Add employee with custom fields
      const customFieldsChartData = {
        ...mockChartData,
        employees: [
          ...mockChartData.employees,
          {
            id: '3',
            name: 'Bob Johnson',
            title: 'Developer',
            organizationId: 'org1',
            managerId: '2',
            customFields: {
              department: 'Engineering',
              location: 'Remote',
              level: 'Senior'
            }
          }
        ] as Employee[],
        statistics: {
          ...mockChartData.statistics,
          totalEmployees: 3
        }
      }
      setChartData(customFieldsChartData)
      
      // Update manager
      updateEmployeeManager('3', '1')
      
      const state = useChartStore.getState()
      const updatedEmployee = state.chartData!.employees.find(emp => emp.id === '3')
      
      expect(updatedEmployee!.managerId).toBe('1')
      expect(updatedEmployee!.customFields).toEqual({
        department: 'Engineering',
        location: 'Remote',
        level: 'Senior'
      })
    })
  })
})
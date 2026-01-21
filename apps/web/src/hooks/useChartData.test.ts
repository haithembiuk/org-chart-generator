import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChartData } from './useChartData'
import { useChartStore } from '@shared/index'

// Mock the tRPC client
vi.mock('../utils/trpc', () => ({
  trpc: {
    parseUploadedFile: {
      useMutation: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isLoading: false,
        error: null
      }))
    }
  }
}))

// Mock the chart store
vi.mock('@shared/index', () => ({
  useChartStore: vi.fn()
}))

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
  ],
  hierarchy: {},
  rootEmployees: [
    {
      id: '1',
      name: 'John Doe',
      title: 'CEO',
      organizationId: 'org1',
      managerId: undefined
    }
  ],
  orphanedEmployees: [],
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

describe('useChartData', () => {
  const mockStore = {
    chartData: null,
    isLoading: false,
    error: null,
    fileUrl: null,
    fileName: null,
    setChartData: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setFileInfo: vi.fn(),
    clearChart: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useChartStore as any).mockReturnValue(mockStore)
  })

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.chartData).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.fileUrl).toBeNull()
    expect(result.current.fileName).toBeNull()
    expect(result.current.employees).toEqual([])
    expect(result.current.rootEmployees).toEqual([])
    expect(result.current.orphanedEmployees).toEqual([])
    expect(result.current.validation).toEqual({ isValid: true, issues: [] })
    expect(result.current.statistics).toEqual({
      totalEmployees: 0,
      rootEmployees: 0,
      orphanedEmployees: 0,
      totalErrors: 0
    })
  })

  it('returns chart data when available', () => {
    const storeWithData = {
      ...mockStore,
      chartData: mockChartData
    }
    ;(useChartStore as any).mockReturnValue(storeWithData)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.chartData).toEqual(mockChartData)
    expect(result.current.employees).toEqual(mockChartData.employees)
    expect(result.current.rootEmployees).toEqual(mockChartData.rootEmployees)
    expect(result.current.orphanedEmployees).toEqual(mockChartData.orphanedEmployees)
    expect(result.current.validation).toEqual(mockChartData.validation)
    expect(result.current.statistics).toEqual(mockChartData.statistics)
  })

  it('provides clear function', () => {
    const { result } = renderHook(() => useChartData())
    
    act(() => {
      result.current.clear()
    })
    
    expect(mockStore.clearChart).toHaveBeenCalled()
  })

  it('handles error state', () => {
    const storeWithError = {
      ...mockStore,
      error: 'Failed to parse file',
      isLoading: false
    }
    ;(useChartStore as any).mockReturnValue(storeWithError)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.error).toBe('Failed to parse file')
    expect(result.current.isLoading).toBe(false)
  })

  it('handles loading state', () => {
    const storeWithLoading = {
      ...mockStore,
      isLoading: true
    }
    ;(useChartStore as any).mockReturnValue(storeWithLoading)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('handles partial chart data', () => {
    const partialChartData = {
      ...mockChartData,
      employees: [],
      rootEmployees: undefined,
      orphanedEmployees: undefined,
      validation: undefined,
      statistics: undefined
    }
    
    const storeWithPartialData = {
      ...mockStore,
      chartData: partialChartData
    }
    ;(useChartStore as any).mockReturnValue(storeWithPartialData)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.employees).toEqual([])
    expect(result.current.rootEmployees).toEqual([])
    expect(result.current.orphanedEmployees).toEqual([])
    expect(result.current.validation).toEqual({ isValid: true, issues: [] })
    expect(result.current.statistics).toEqual({
      totalEmployees: 0,
      rootEmployees: 0,
      orphanedEmployees: 0,
      totalErrors: 0
    })
  })

  it('handles file information', () => {
    const storeWithFileInfo = {
      ...mockStore,
      fileUrl: 'https://example.com/file.csv',
      fileName: 'test-file.csv'
    }
    ;(useChartStore as any).mockReturnValue(storeWithFileInfo)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.fileUrl).toBe('https://example.com/file.csv')
    expect(result.current.fileName).toBe('test-file.csv')
  })

  it('handles validation issues', () => {
    const chartDataWithIssues = {
      ...mockChartData,
      validation: {
        isValid: false,
        issues: ['Invalid manager ID found', 'Duplicate employee names detected']
      }
    }
    
    const storeWithIssues = {
      ...mockStore,
      chartData: chartDataWithIssues
    }
    ;(useChartStore as any).mockReturnValue(storeWithIssues)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.validation.isValid).toBe(false)
    expect(result.current.validation.issues).toEqual([
      'Invalid manager ID found',
      'Duplicate employee names detected'
    ])
  })

  it('handles statistics correctly', () => {
    const chartDataWithStats = {
      ...mockChartData,
      statistics: {
        totalEmployees: 100,
        rootEmployees: 5,
        orphanedEmployees: 3,
        totalErrors: 2
      }
    }
    
    const storeWithStats = {
      ...mockStore,
      chartData: chartDataWithStats
    }
    ;(useChartStore as any).mockReturnValue(storeWithStats)
    
    const { result } = renderHook(() => useChartData())
    
    expect(result.current.statistics).toEqual({
      totalEmployees: 100,
      rootEmployees: 5,
      orphanedEmployees: 3,
      totalErrors: 2
    })
  })
})
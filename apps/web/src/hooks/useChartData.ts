import { useCallback } from 'react'
import { trpc } from '../utils/trpc'
import { useChartStore } from '@shared/index'

export const useChartData = () => {
  const { 
    chartData, 
    isLoading, 
    error, 
    fileUrl, 
    fileName,
    setChartData, 
    setLoading, 
    setError, 
    setFileInfo,
    clearChart 
  } = useChartStore()

  const parseUploadedFile = trpc.parseUploadedFile.useMutation({
    onMutate: () => {
      setLoading(true)
      setError(null)
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setChartData(data.data)
      } else {
        setError('Failed to parse uploaded file')
      }
      setLoading(false)
    },
    onError: (error) => {
      setError(error.message || 'Failed to parse uploaded file')
      setLoading(false)
    }
  })

  const parseFile = useCallback(async (fileUrl: string, fileName: string) => {
    setFileInfo(fileUrl, fileName)
    await parseUploadedFile.mutateAsync({ fileUrl, fileName })
  }, [parseUploadedFile, setFileInfo])

  const clear = useCallback(() => {
    clearChart()
  }, [clearChart])

  return {
    chartData,
    isLoading,
    error,
    fileUrl,
    fileName,
    parseFile,
    clear,
    employees: chartData?.employees || [],
    rootEmployees: chartData?.rootEmployees || [],
    orphanedEmployees: chartData?.orphanedEmployees || [],
    validation: chartData?.validation || { isValid: true, issues: [] },
    statistics: chartData?.statistics || { 
      totalEmployees: 0, 
      rootEmployees: 0, 
      orphanedEmployees: 0, 
      totalErrors: 0 
    }
  }
}
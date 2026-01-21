import { Header, ChartViewerPlaceholder, ChartViewer, ChartTooltip, Button, AddEmployeeModal } from '@ui/index'
import { useRef, useState } from 'react'
import { Upload, UserPlus, Trash2, BarChart3, Users, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { trpc } from '../utils/trpc'
import { useChartData } from '../hooks/useChartData'
import { Employee } from '@shared/index'
import { useChartStore } from '@shared/chart-store'
import html2canvas from 'html2canvas'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [hoveredEmployee, setHoveredEmployee] = useState<Employee | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [lastFailedOperation, setLastFailedOperation] = useState<{employeeId: string, newManagerId: string} | null>(null)
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const uploadFile = trpc.uploadFile.useMutation()
  const updateManager = trpc.organization.updateManager.useMutation()
  const createEmployee = trpc.organization.createEmployee.useMutation()
  const { chartData, employees, isLoading, error, parseFile, clear } = useChartData()
  const { isSaving, saveError, setSaving, setSaveError, updateEmployeeManager, addEmployee } = useChartStore()

  const handleImportData = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const validExtensions = ['.csv', '.xlsx']
    
    if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return { isValid: false, error: 'Please select a valid CSV or XLSX file.' }
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }
    }
    
    return { isValid: true }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const validation = validateFile(file)
    if (!validation.isValid) {
      setUploadStatus(validation.error || 'Invalid file')
      event.target.value = ''
      return
    }
    
    setUploading(true)
    setUploadStatus('Uploading...')
    
    try {
      const fileContent = await fileToBase64(file)
      
      const result = await uploadFile.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileContent
      })
      
      if (result.success) {
        setUploadStatus(`File uploaded successfully: ${result.fileName}`)
        console.log('Upload result:', result)
        // Automatically parse the uploaded file
        await parseFile(result.url, result.fileName)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleNodeClick = (employee: Employee) => {
    console.log('Clicked employee:', employee)
    // Future: could open employee detail modal or navigate to employee page
  }

  const handleNodeHover = (employee: Employee | null) => {
    setHoveredEmployee(employee)
    if (employee) {
      // Get mouse position for tooltip
      const handleMouseMove = (e: MouseEvent) => {
        setTooltipPosition({ x: e.clientX, y: e.clientY })
      }
      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }

  const handleClearChart = () => {
    clear()
    setUploadStatus('')
  }

  const handleManagerChange = async (employeeId: string, newManagerId: string | null) => {
    if (!newManagerId) return // Don't save null manager changes for now
    
    // Store the current manager to revert if save fails
    const currentEmployee = employees.find(emp => emp.id === employeeId)
    const previousManagerId = currentEmployee?.managerId || null
    
    // Optimistically update the local state first
    updateEmployeeManager(employeeId, newManagerId)
    setSaving(true)
    setSaveError(null)
    
    try {
      const result = await updateManager.mutateAsync({
        employeeId,
        newManagerId
      })
      
      if (result.success) {
        // Save was successful, clear loading state
        setSaving(false)
      }
    } catch (error: any) {
      console.error('Failed to save manager change:', error)
      
      // Revert the local state change on save failure
      updateEmployeeManager(employeeId, previousManagerId)
      
      // Store the failed operation for retry
      setLastFailedOperation({ employeeId, newManagerId })
      
      // Set error message with specific details if available
      let errorMessage = 'Failed to save changes. Please try again.'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.data?.message) {
        errorMessage = error.data.message
      }
      
      setSaveError(errorMessage)
    }
  }

  const handleSaveStatusChange = (saving: boolean, error?: string | null) => {
    if (!saving) {
      setSaving(false)
      if (error !== undefined) {
        setSaveError(error)
      }
      // Clear the last failed operation when dismissing the error
      if (error === null) {
        setLastFailedOperation(null)
      }
    }
  }

  const handleRetry = () => {
    if (lastFailedOperation) {
      handleManagerChange(lastFailedOperation.employeeId, lastFailedOperation.newManagerId)
    }
  }

  const handleNodeEdit = async (employeeId: string, updatedData: { name: string; title: string }) => {
    console.log('Editing employee:', employeeId, updatedData)
    
    // Update the local state optimistically
    const { updateEmployee } = useChartStore.getState()
    updateEmployee(employeeId, updatedData)
    
    // TODO: Add API call to save the changes to the server
    // For now, we'll just update the local state
    // Example API call:
    // try {
    //   await updateEmployee.mutateAsync({
    //     employeeId,
    //     name: updatedData.name,
    //     title: updatedData.title
    //   })
    // } catch (error) {
    //   console.error('Failed to save employee changes:', error)
    //   // Revert changes if API call fails
    // }
  }

  const handleExportChart = async () => {
    setIsExporting(true)
    try {
      // Get the chart container element
      const chartElement = document.querySelector('[data-chart-container]') as HTMLElement
      if (!chartElement) {
        console.error('Chart container not found')
        return
      }

      // Use html2canvas to capture the chart
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        height: chartElement.scrollHeight,
        width: chartElement.scrollWidth,
        scrollX: 0,
        scrollY: 0,
      })

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas')
          return
        }
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `hps-org-chart-${new Date().toISOString().split('T')[0]}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        console.log('Chart exported successfully!')
      }, 'image/png', 0.95)

    } catch (error) {
      console.error('Export failed:', error)
      // You could show an error message to the user here
    } finally {
      setIsExporting(false)
    }
  }

  const handleAddEmployee = async (employeeData: {
    name: string
    title: string
    managerId?: string | null
  }) => {
    // Assume we have a default organization ID - you may need to adjust this
    const organizationId = 'default-org'

    try {
      const result = await createEmployee.mutateAsync({
        name: employeeData.name,
        title: employeeData.title,
        organizationId,
        managerId: employeeData.managerId || null
      })

      if (result.success) {
        if (chartData) {
          // Add the new employee to existing chart data
          addEmployee(result.data)
        } else {
          // Initialize chart data with the first employee
          const newChartData = {
            employees: [result.data],
            hierarchy: {},
            rootEmployees: result.data.managerId ? [] : [result.data],
            orphanedEmployees: [],
            columnIdentification: {
              nameColumn: 0,
              managerColumn: null,
              confidence: 1,
              analysis: 'Manually created employee'
            },
            validation: {
              isValid: true,
              issues: []
            },
            statistics: {
              totalEmployees: 1,
              rootEmployees: result.data.managerId ? 0 : 1,
              orphanedEmployees: 0,
              totalErrors: 0
            }
          }
          const { setChartData } = useChartStore.getState()
          setChartData(newChartData)
        }
        setIsAddEmployeeModalOpen(false)
      }
    } catch (error: any) {
      console.error('Failed to create employee:', error)
      // You might want to show an error message to the user here
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Header />
      <main className="w-full px-4 pt-4 pb-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent tracking-tight">Chart Workspace</h2>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <div className="flex space-x-2">
                <Button onClick={handleImportData} disabled={uploading || isLoading}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : isLoading ? 'Processing...' : 'Import Data'}
                </Button>
                <Button 
                  onClick={() => setIsAddEmployeeModalOpen(true)} 
                  variant="primary"
                  disabled={createEmployee.isPending}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
                {chartData && (
                  <>
                    <Button onClick={handleExportChart} variant="primary" disabled={isExporting}>
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exporting...' : 'Export Chart'}
                    </Button>
                    <Button onClick={handleClearChart} variant="secondary">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Chart
                    </Button>
                  </>
                )}
              </div>
              {(uploadStatus || error) && (
                <div className={`text-sm px-3 py-2 rounded-lg backdrop-blur-sm border flex items-center space-x-2 font-medium ${
                  uploadStatus?.includes('success') 
                    ? 'bg-green-900/50 text-green-400 border-green-700/50' 
                    : error || uploadStatus?.includes('Failed') || uploadStatus?.includes('Invalid')
                    ? 'bg-red-900/50 text-red-400 border-red-700/50'
                    : 'bg-blue-900/50 text-blue-400 border-blue-700/50'
                }`}>
                  {uploadStatus?.includes('success') ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (error || uploadStatus?.includes('Failed') || uploadStatus?.includes('Invalid')) ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{error || uploadStatus}</span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv,.xlsx"
                style={{ display: 'none' }}
              />
            </div>
          </div>
          
          {/* Chart Display Area */}
          <div className="relative">
            {chartData && employees.length > 0 ? (
              <div data-chart-container>
                <ChartViewer
                  employees={employees}
                  className="min-h-[calc(100vh-200px)]"
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                  onManagerChange={handleManagerChange}
                  onNodeEdit={handleNodeEdit}
                  isSaving={isSaving}
                  saveError={saveError}
                  onSaveStatusChange={handleSaveStatusChange}
                  onRetry={handleRetry}
                />
              </div>
            ) : (
              <ChartViewerPlaceholder className="min-h-[calc(100vh-200px)]" />
            )}
            
            {/* Tooltip */}
            <ChartTooltip
              employee={hoveredEmployee}
              position={tooltipPosition}
            />
          </div>
          
          {/* Chart Statistics */}
          {chartData && (
            <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50 shadow-xl">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-semibold text-gray-100 tracking-tight">Chart Statistics</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-lg border border-blue-700/30">
                  <div className="text-xl font-bold text-blue-400 mb-1">{chartData.statistics.totalEmployees}</div>
                  <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">Total Employees</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-lg border border-green-700/30">
                  <div className="text-xl font-bold text-green-400 mb-1">{chartData.statistics.rootEmployees}</div>
                  <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">Root Employees</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-lg border border-amber-700/30">
                  <div className="text-xl font-bold text-amber-400 mb-1">{chartData.statistics.orphanedEmployees}</div>
                  <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">Orphaned</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-red-900/40 to-pink-900/40 rounded-lg border border-red-700/30">
                  <div className="text-xl font-bold text-red-400 mb-1">{chartData.statistics.totalErrors}</div>
                  <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">Errors</div>
                </div>
              </div>
              {chartData.validation.issues.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <h4 className="font-semibold text-red-400 tracking-tight">Validation Issues</h4>
                  </div>
                  <ul className="text-sm text-red-300 space-y-2">
                    {chartData.validation.issues.map((issue, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1 h-1 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="font-medium">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onSubmit={handleAddEmployee}
        availableManagers={employees}
        organizationId="default-org"
        isLoading={createEmployee.isPending}
      />
    </div>
  )
}
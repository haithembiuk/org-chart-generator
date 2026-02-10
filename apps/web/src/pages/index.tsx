import { Header, ChartViewerPlaceholder, ChartViewer, ChartTooltip, Button, AddEmployeeModal, ToastProvider, useToast } from '@ui/index'
import { useRef, useState, useEffect } from 'react'
import { Upload, UserPlus, Trash2, Users, AlertCircle, Download, Loader2, FileSpreadsheet } from 'lucide-react'
import { trpc } from '../utils/trpc'
import { useChartData } from '../hooks/useChartData'
import { Employee } from '@shared/index'
import { useChartStore } from '@shared/chart-store'
import html2canvas from 'html2canvas'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

function HomeContent() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
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
  const { showToast } = useToast()

  // Show error toast when chart loading error occurs
  useEffect(() => {
    if (error) {
      showToast('error', error)
    }
  }, [error, showToast])

  // Show error toast when save error occurs
  useEffect(() => {
    if (saveError) {
      showToast('error', saveError)
    }
  }, [saveError, showToast])

  const handleImportData = () => {
    if (uploadState === 'idle' || uploadState === 'complete' || uploadState === 'error') {
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
      showToast('error', validation.error || 'Invalid file')
      event.target.value = ''
      return
    }

    setUploadState('uploading')

    try {
      const fileContent = await fileToBase64(file)

      const result = await uploadFile.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileContent
      })

      if (result.success) {
        setUploadState('processing')
        await parseFile(result.url, result.fileName)
        setUploadState('complete')
        showToast('success', `Successfully imported ${result.fileName}`)

        // Reset state after a delay
        setTimeout(() => setUploadState('idle'), 2000)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadState('error')
      showToast('error', 'Failed to upload file. Please try again.')

      // Reset state after a delay
      setTimeout(() => setUploadState('idle'), 3000)
    } finally {
      event.target.value = ''
    }
  }

  const handleNodeClick = (employee: Employee) => {
    // Future: could open employee detail modal or navigate to employee page
  }

  const handleNodeHover = (employee: Employee | null) => {
    setHoveredEmployee(employee)
    if (employee) {
      const handleMouseMove = (e: MouseEvent) => {
        setTooltipPosition({ x: e.clientX, y: e.clientY })
      }
      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }

  const handleClearChart = () => {
    clear()
    setUploadState('idle')
    showToast('info', 'Chart cleared')
  }

  const handleManagerChange = async (employeeId: string, newManagerId: string | null) => {
    if (!newManagerId) return

    const currentEmployee = employees.find(emp => emp.id === employeeId)
    const previousManagerId = currentEmployee?.managerId || null

    updateEmployeeManager(employeeId, newManagerId)
    setSaving(true)
    setSaveError(null)

    try {
      const result = await updateManager.mutateAsync({
        employeeId,
        newManagerId
      })

      if (result.success) {
        setSaving(false)
        showToast('success', 'Manager updated successfully')
      }
    } catch (err: any) {
      console.error('Failed to save manager change:', err)

      updateEmployeeManager(employeeId, previousManagerId)
      setLastFailedOperation({ employeeId, newManagerId })

      let errorMessage = 'Failed to save changes. Please try again.'
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.data?.message) {
        errorMessage = err.data.message
      }

      setSaveError(errorMessage)
    }
  }

  const handleCircularReferenceError = (employeeId: string, targetId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    const target = employees.find(emp => emp.id === targetId)
    showToast('error', `Cannot assign ${employee?.name || 'employee'} to ${target?.name || 'target'}: would create circular reference`)
  }

  const handleSaveStatusChange = (saving: boolean, error?: string | null) => {
    if (!saving) {
      setSaving(false)
      if (error !== undefined) {
        setSaveError(error)
      }
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
    const { updateEmployee } = useChartStore.getState()
    updateEmployee(employeeId, updatedData)
    showToast('success', 'Employee updated')
  }

  const handleExportChart = async () => {
    setIsExporting(true)
    try {
      const chartElement = document.querySelector('[data-chart-container]') as HTMLElement
      if (!chartElement) {
        showToast('error', 'Chart container not found')
        return
      }

      // Hide overlay controls (search, zoom buttons) during capture
      const overlays = chartElement.querySelectorAll<HTMLElement>('[data-chart-overlay]')
      overlays.forEach(el => el.style.display = 'none')

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        height: chartElement.scrollHeight,
        width: chartElement.scrollWidth,
        scrollX: 0,
        scrollY: 0,
      } as Parameters<typeof html2canvas>[1])

      // Restore overlay controls
      overlays.forEach(el => el.style.display = '')

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('error', 'Failed to generate image')
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

        showToast('success', 'Chart exported successfully')
      }, 'image/png', 0.95)

    } catch (err) {
      console.error('Export failed:', err)
      showToast('error', 'Failed to export chart')
    } finally {
      // Ensure overlays are always restored
      const chartEl = document.querySelector('[data-chart-container]')
      chartEl?.querySelectorAll<HTMLElement>('[data-chart-overlay]').forEach(el => el.style.display = '')
      setIsExporting(false)
    }
  }

  const handleAddEmployee = async (employeeData: {
    name: string
    title: string
    managerId?: string | null
  }) => {
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
          addEmployee(result.data)
        } else {
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
        showToast('success', `Added ${employeeData.name} to the organization`)
      }
    } catch (err: any) {
      console.error('Failed to create employee:', err)
      showToast('error', err?.message || 'Failed to add employee')
    }
  }

  const getButtonText = () => {
    switch (uploadState) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing...'
      default:
        return isLoading ? 'Processing...' : 'Import Data'
    }
  }

  const isButtonDisabled = uploadState === 'uploading' || uploadState === 'processing' || isLoading

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="mx-auto max-w-screen-2xl px-2 py-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {chartData && (
              <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{chartData.statistics.totalEmployees} employees</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleImportData} disabled={isButtonDisabled}>
              {isButtonDisabled ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {getButtonText()}
            </Button>
            <Button
              onClick={() => setIsAddEmployeeModalOpen(true)}
              variant="secondary"
              disabled={createEmployee.isPending}
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
            {chartData && (
              <>
                <Button onClick={handleExportChart} variant="secondary" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
                </Button>
                <Button onClick={handleClearChart} variant="ghost">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv,.xlsx"
            className="hidden"
          />
        </div>

        {/* Chart Display Area */}
        <div className="relative">
          {/* Export loading overlay */}
          {isExporting && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
              <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                <span className="text-slate-200 font-medium">Generating chart image...</span>
              </div>
            </div>
          )}

          {chartData && employees.length > 0 ? (
            <div data-chart-container>
              <ChartViewer
                employees={employees}
                className="min-h-[calc(100vh-220px)]"
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                onManagerChange={handleManagerChange}
                onNodeEdit={handleNodeEdit}
                onCircularReferenceError={handleCircularReferenceError}
                isSaving={isSaving}
                saveError={null}
                onSaveStatusChange={handleSaveStatusChange}
                onRetry={handleRetry}
              />
            </div>
          ) : (
            <ChartViewerPlaceholder className="min-h-[calc(100vh-220px)]" />
          )}

          {/* Tooltip */}
          <ChartTooltip
            employee={hoveredEmployee}
            position={tooltipPosition}
          />
        </div>

        {/* Chart Statistics */}
        {chartData && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Statistics</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
                <div className="text-2xl font-bold text-white mb-1">{chartData.statistics.totalEmployees}</div>
                <div className="text-xs text-slate-400 font-medium">Total Employees</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
                <div className="text-2xl font-bold text-emerald-400 mb-1">{chartData.statistics.rootEmployees}</div>
                <div className="text-xs text-slate-400 font-medium">Root Employees</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
                <div className="text-2xl font-bold text-amber-400 mb-1">{chartData.statistics.orphanedEmployees}</div>
                <div className="text-xs text-slate-400 font-medium">Orphaned</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
                <div className="text-2xl font-bold text-rose-400 mb-1">{chartData.statistics.totalErrors}</div>
                <div className="text-xs text-slate-400 font-medium">Errors</div>
              </div>
            </div>
            {chartData.validation.issues.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-medium text-rose-400">Validation Issues</h4>
                </div>
                <ul className="space-y-2">
                  {chartData.validation.issues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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

export default function Home() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  )
}

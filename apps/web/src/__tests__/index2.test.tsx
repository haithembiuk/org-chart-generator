import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from './index'
import { trpc } from '../utils/trpc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock tRPC
vi.mock('../utils/trpc', () => ({
  trpc: {
    uploadFile: {
      useMutation: vi.fn()
    },
    parseUploadedFile: {
      useMutation: vi.fn()
    },
    Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  }
}))

// Mock UI components
vi.mock('@ui/index', () => ({
  Header: () => <div data-testid="header">Header</div>,
  ChartViewerPlaceholder: ({ className }: { className: string }) => (
    <div data-testid="chart-placeholder" className={className}>Chart Placeholder</div>
  ),
  ChartViewer: ({ employees, className }: { employees: any[], className?: string }) => (
    <div data-testid="chart-viewer" className={className}>
      Chart with {employees.length} employees
    </div>
  ),
  ChartTooltip: ({ employee, position }: { employee: any, position: { x: number, y: number } }) => (
    employee ? <div data-testid="chart-tooltip">Tooltip for {employee.name}</div> : null
  ),
  Button: ({ onClick, disabled, children }: { onClick: () => void, disabled?: boolean, children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} data-testid="import-button">
      {children}
    </button>
  )
}))

describe('Home Page File Upload', () => {
  const mockMutateAsync = vi.fn()
  const mockUploadFile = {
    mutateAsync: mockMutateAsync
  }
  const mockParseUploadedFile = {
    mutateAsync: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(trpc.uploadFile.useMutation).mockReturnValue(mockUploadFile as any)
    vi.mocked(trpc.parseUploadedFile.useMutation).mockReturnValue(mockParseUploadedFile as any)
  })

  const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders import button', () => {
    renderWithProviders(<Home />)
    expect(screen.getByTestId('import-button')).toBeInTheDocument()
    expect(screen.getByText('Import Data')).toBeInTheDocument()
  })

  it('opens file dialog when import button is clicked', () => {
    renderWithProviders(<Home />)
    const importButton = screen.getByTestId('import-button')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const clickSpy = vi.spyOn(fileInput, 'click')
    fireEvent.click(importButton)
    
    expect(clickSpy).toHaveBeenCalled()
  })

  it('validates file type and rejects invalid files', async () => {
    renderWithProviders(<Home />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } })
    
    await waitFor(() => {
      expect(screen.getByText('Please select a valid CSV or XLSX file.')).toBeInTheDocument()
    })
  })

  it('successfully uploads a valid CSV file', async () => {
    mockMutateAsync.mockResolvedValue({
      success: true,
      fileName: 'test.csv',
      url: 'https://example.com/test.csv'
    })
    
    renderWithProviders(<Home />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const validFile = new File(['name,age\nJohn,30'], 'test.csv', { type: 'text/csv' })
    
    fireEvent.change(fileInput, { target: { files: [validFile] } })
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        fileName: 'test.csv',
        fileType: 'text/csv',
        fileContent: expect.any(String)
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('File uploaded successfully: test.csv')).toBeInTheDocument()
    })
  })

  it('successfully uploads a valid XLSX file', async () => {
    mockMutateAsync.mockResolvedValue({
      success: true,
      fileName: 'test.xlsx',
      url: 'https://example.com/test.xlsx'
    })
    
    renderWithProviders(<Home />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const validFile = new File(['mock excel content'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    fireEvent.change(fileInput, { target: { files: [validFile] } })
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        fileName: 'test.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileContent: expect.any(String)
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('File uploaded successfully: test.xlsx')).toBeInTheDocument()
    })
  })

  it('handles upload errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockMutateAsync.mockRejectedValue(new Error('Upload failed'))
    
    renderWithProviders(<Home />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const validFile = new File(['name,age\nJohn,30'], 'test.csv', { type: 'text/csv' })
    
    fireEvent.change(fileInput, { target: { files: [validFile] } })
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Upload error:', expect.any(Error))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Failed to upload file. Please try again.')).toBeInTheDocument()
    })
    
    consoleSpy.mockRestore()
  })

  it('shows uploading state during file upload', async () => {
    let resolveUpload: (value: any) => void
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve
    })
    mockMutateAsync.mockReturnValue(uploadPromise)
    
    renderWithProviders(<Home />)
    const importButton = screen.getByTestId('import-button')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const validFile = new File(['name,age\nJohn,30'], 'test.csv', { type: 'text/csv' })
    
    fireEvent.change(fileInput, { target: { files: [validFile] } })
    
    await waitFor(() => {
      expect(screen.getAllByText('Uploading...')).toHaveLength(2) // Button text and status message
      expect(importButton).toBeDisabled()
    })
    
    resolveUpload!({ success: true, fileName: 'test.csv', url: 'https://example.com/test.csv' })
    
    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeInTheDocument()
      expect(importButton).not.toBeDisabled()
    })
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from '../pages/index'
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
    }
  }
}))

// Mock UI components
vi.mock('@ui/index', () => ({
  Header: () => <div data-testid="header">Organization Chart Generator</div>,
  ChartViewerPlaceholder: ({ className }: { className: string }) => (
    <div data-testid="chart-placeholder" className={className}>
      <div>Organization Chart Preview</div>
      <div>Your generated chart will appear here</div>
    </div>
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

describe('Home Page', () => {
  const mockMutateAsync = vi.fn()
  const mockUploadFile = {
    mutateAsync: mockMutateAsync
  }
  const mockParseUploadedFile = {
    mutateAsync: vi.fn()
  }

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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(trpc.uploadFile.useMutation).mockReturnValue(mockUploadFile as any)
    vi.mocked(trpc.parseUploadedFile.useMutation).mockReturnValue(mockParseUploadedFile as any)
  })

  it('renders header with title', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Organization Chart Generator')).toBeInTheDocument()
  })

  it('renders chart workspace section', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Chart Workspace')).toBeInTheDocument()
  })

  it('renders import data button', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Import Data')).toBeInTheDocument()
  })

  it('renders chart viewer placeholder', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Organization Chart Preview')).toBeInTheDocument()
    expect(screen.getByText('Your generated chart will appear here')).toBeInTheDocument()
  })

  it('handles import data button click', () => {
    renderWithProviders(<Home />)
    const importButton = screen.getByTestId('import-button')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    const clickSpy = vi.spyOn(fileInput, 'click')
    fireEvent.click(importButton)
    
    expect(clickSpy).toHaveBeenCalled()
  })

  it('has proper page structure', () => {
    renderWithProviders(<Home />)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main.className).toContain('max-w-7xl')
  })
})
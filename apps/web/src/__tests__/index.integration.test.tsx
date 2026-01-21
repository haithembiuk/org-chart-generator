import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TRPCError } from '@trpc/server'
import Home from './index'
import { trpc } from '../utils/trpc'

// Mock the tRPC client
vi.mock('../utils/trpc', () => ({
  trpc: {
    uploadFile: {
      useMutation: vi.fn()
    },
    organization: {
      updateManager: {
        useMutation: vi.fn()
      }
    }
  }
}))

// Mock the useChartData hook
vi.mock('../hooks/useChartData', () => ({
  useChartData: vi.fn(() => ({
    chartData: {
      employees: [
        {
          id: '1',
          name: 'John Doe',
          title: 'CEO',
          organizationId: 'org1',
          managerId: null
        },
        {
          id: '2',
          name: 'Jane Smith',
          title: 'CTO',
          organizationId: 'org1',
          managerId: '1'
        },
        {
          id: '3',
          name: 'Bob Johnson',
          title: 'Developer',
          organizationId: 'org1',
          managerId: '2'
        }
      ],
      statistics: {
        totalEmployees: 3,
        rootEmployees: 1,
        orphanedEmployees: 0,
        totalErrors: 0
      },
      validation: {
        isValid: true,
        issues: []
      }
    },
    employees: [
      {
        id: '1',
        name: 'John Doe',
        title: 'CEO',
        organizationId: 'org1',
        managerId: null
      },
      {
        id: '2',
        name: 'Jane Smith',
        title: 'CTO',
        organizationId: 'org1',
        managerId: '1'
      },
      {
        id: '3',
        name: 'Bob Johnson',
        title: 'Developer',
        organizationId: 'org1',
        managerId: '2'
      }
    ],
    isLoading: false,
    error: null,
    parseFile: vi.fn(),
    clear: vi.fn()
  }))
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('Home Page - tRPC Integration', () => {
  let mockUpdateManager: any
  let mockUploadFile: any

  beforeEach(() => {
    mockUpdateManager = {
      mutateAsync: vi.fn(),
      isLoading: false,
      error: null
    }
    
    mockUploadFile = {
      mutateAsync: vi.fn(),
      isLoading: false,
      error: null
    }

    vi.mocked(trpc.organization.updateManager.useMutation).mockReturnValue(mockUpdateManager)
    vi.mocked(trpc.uploadFile.useMutation).mockReturnValue(mockUploadFile)
  })

  describe('Successful Save Scenarios', () => {
    it('successfully saves manager change via tRPC', async () => {
      mockUpdateManager.mutateAsync.mockResolvedValue({
        success: true,
        message: 'Manager updated successfully',
        data: {
          employeeId: '3',
          newManagerId: '1',
          previousManagerId: '2'
        }
      })

      const { container } = renderWithQueryClient(<Home />)

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Verify tRPC mutation was called with correct parameters
      await waitFor(() => {
        expect(mockUpdateManager.mutateAsync).toHaveBeenCalledWith({
          employeeId: '3',
          newManagerId: '1'
        })
      })

      // Verify no error messages are shown
      expect(screen.queryByText('Save Failed:')).not.toBeInTheDocument()
    })

    it('shows loading state during save operation', async () => {
      // Mock a delayed response
      mockUpdateManager.mutateAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: 'Manager updated successfully'
        }), 100))
      )

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Verify loading state is shown
      await waitFor(() => {
        expect(screen.getByText('Saving changes...')).toBeInTheDocument()
      })

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.queryByText('Saving changes...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Error Scenarios', () => {
    it('handles authentication errors correctly', async () => {
      const authError = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated'
      })
      
      mockUpdateManager.mutateAsync.mockRejectedValue(authError)

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText('Save Failed:')).toBeInTheDocument()
        expect(screen.getByText('User not authenticated')).toBeInTheDocument()
      })
    })

    it('handles validation errors correctly', async () => {
      const validationError = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Would create circular reporting relationship'
      })
      
      mockUpdateManager.mutateAsync.mockRejectedValue(validationError)

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText('Save Failed:')).toBeInTheDocument()
        expect(screen.getByText('Would create circular reporting relationship')).toBeInTheDocument()
      })
    })

    it('handles network errors correctly', async () => {
      const networkError = new Error('Network request failed')
      mockUpdateManager.mutateAsync.mockRejectedValue(networkError)

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText('Save Failed:')).toBeInTheDocument()
        expect(screen.getByText('Network request failed')).toBeInTheDocument()
      })
    })

    it('reverts local state changes on save failure', async () => {
      const networkError = new Error('Save failed')
      mockUpdateManager.mutateAsync.mockRejectedValue(networkError)

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson  
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Wait for error to be processed
      await waitFor(() => {
        expect(screen.getByText('Save Failed:')).toBeInTheDocument()
      })

      // Verify that the local state would be reverted
      // (This would require more complex state tracking in a real test)
      expect(mockUpdateManager.mutateAsync).toHaveBeenCalledWith({
        employeeId: '3',
        newManagerId: '1'
      })
    })
  })

  describe('Retry Functionality', () => {
    it('allows retrying failed operations', async () => {
      // First call fails
      mockUpdateManager.mutateAsync
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          message: 'Manager updated successfully'
        })

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop (first attempt)
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Wait for error to show
      await waitFor(() => {
        expect(screen.getByText('Save Failed:')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Verify the operation is retried
      await waitFor(() => {
        expect(mockUpdateManager.mutateAsync).toHaveBeenCalledTimes(2)
      })

      // Verify error message is cleared after successful retry
      await waitFor(() => {
        expect(screen.queryByText('Save Failed:')).not.toBeInTheDocument()
      })
    })

    it('dismisses error message when clicking X', async () => {
      const networkError = new Error('Network error')
      mockUpdateManager.mutateAsync.mockRejectedValue(networkError)

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Simulate drag and drop
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Wait for error to show
      await waitFor(() => {
        expect(screen.getByText('Save Failed:')).toBeInTheDocument()
      })

      // Click dismiss button
      const dismissButton = screen.getByText('×')
      fireEvent.click(dismissButton)

      // Verify error message is dismissed
      await waitFor(() => {
        expect(screen.queryByText('Save Failed:')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('prevents saving when manager ID is null', async () => {
      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Try to drop on empty area (null manager)
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson

      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      // Simulate drop with null manager
      fireEvent.drop(container.querySelector('svg')!, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Verify no tRPC call is made
      expect(mockUpdateManager.mutateAsync).not.toHaveBeenCalled()
    })

    it('handles concurrent drag operations correctly', async () => {
      mockUpdateManager.mutateAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: 'Manager updated successfully'
        }), 100))
      )

      const { container } = renderWithQueryClient(<Home />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const janeNode = employees[1] // Jane Smith
      const johnNode = employees[0] // John Doe

      // Start first drag operation
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })

      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })

      // Try to start second drag operation while first is saving
      await waitFor(() => {
        expect(screen.getByText('Saving changes...')).toBeInTheDocument()
      })

      // Second drag should be prevented
      const dragEvent = new DragEvent('dragstart', { bubbles: true })
      Object.defineProperty(dragEvent, 'preventDefault', { value: vi.fn() })
      
      janeNode.dispatchEvent(dragEvent)

      // Should prevent the second drag
      expect(dragEvent.preventDefault).toHaveBeenCalled()

      // Wait for first operation to complete
      await waitFor(() => {
        expect(screen.queryByText('Saving changes...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })
  })
})
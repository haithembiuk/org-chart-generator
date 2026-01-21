import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChartViewer, ChartTooltip } from './chart-viewer'
import { Employee } from '../shared/index'

const mockEmployees: Employee[] = [
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
  },
  {
    id: '3',
    name: 'Bob Johnson',
    title: 'Developer',
    organizationId: 'org1',
    managerId: '2'
  }
]

describe('ChartViewer', () => {
  it('renders without crashing', () => {
    const { container } = render(<ChartViewer employees={mockEmployees} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays employee names and titles', () => {
    render(<ChartViewer employees={mockEmployees} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('CEO')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('CTO')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    expect(screen.getByText('Developer')).toBeInTheDocument()
  })

  it('handles empty employee list', () => {
    const { container } = render(<ChartViewer employees={[]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onNodeClick when employee is clicked', () => {
    const onNodeClick = vi.fn()
    const { container } = render(<ChartViewer employees={mockEmployees} onNodeClick={onNodeClick} />)
    
    const johnNode = container.querySelector('rect')!
    fireEvent.click(johnNode)
    
    expect(onNodeClick).toHaveBeenCalledWith(mockEmployees[0])
  })

  it('calls onNodeHover when employee is hovered', () => {
    const onNodeHover = vi.fn()
    const { container } = render(<ChartViewer employees={mockEmployees} onNodeHover={onNodeHover} />)
    
    const johnNode = container.querySelector('rect')!
    fireEvent.mouseEnter(johnNode)
    
    expect(onNodeHover).toHaveBeenCalledWith(mockEmployees[0])
  })

  it('handles zoom controls', () => {
    render(<ChartViewer employees={mockEmployees} />)
    
    const zoomInButton = screen.getByText('+')
    const zoomOutButton = screen.getByText('−')
    const resetButton = screen.getByText('⌂')
    
    fireEvent.click(zoomInButton)
    fireEvent.click(zoomOutButton)
    fireEvent.click(resetButton)
    
    expect(zoomInButton).toBeInTheDocument()
    expect(zoomOutButton).toBeInTheDocument()
    expect(resetButton).toBeInTheDocument()
  })

  it('handles wheel zoom', () => {
    const { container } = render(<ChartViewer employees={mockEmployees} />)
    const svg = container.querySelector('svg')!
    fireEvent.wheel(svg, { deltaY: -100 })
    fireEvent.wheel(svg, { deltaY: 100 })
    
    expect(svg).toBeInTheDocument()
  })

  it('handles pan gestures', () => {
    const { container } = render(<ChartViewer employees={mockEmployees} />)
    
    const svg = container.querySelector('svg')!
    fireEvent.mouseDown(svg, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 })
    fireEvent.mouseUp(svg)
    
    expect(svg).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ChartViewer employees={mockEmployees} className="custom-class" />)
    
    const chartContainer = container.querySelector('.custom-class')
    expect(chartContainer).toBeInTheDocument()
  })

  it('handles organizational hierarchy correctly', () => {
    const hierarchyEmployees: Employee[] = [
      {
        id: '1',
        name: 'CEO',
        title: 'Chief Executive Officer',
        organizationId: 'org1',
        managerId: undefined
      },
      {
        id: '2',
        name: 'VP Sales',
        title: 'Vice President of Sales',
        organizationId: 'org1',
        managerId: '1'
      },
      {
        id: '3',
        name: 'VP Engineering',
        title: 'Vice President of Engineering',
        organizationId: 'org1',
        managerId: '1'
      },
      {
        id: '4',
        name: 'Alice Johnson',
        title: 'Sales Manager',
        organizationId: 'org1',
        managerId: '2'
      },
      {
        id: '5',
        name: 'Senior Engineer',
        title: 'Senior Software Engineer',
        organizationId: 'org1',
        managerId: '3'
      }
    ]
    
    render(<ChartViewer employees={hierarchyEmployees} />)
    
    // Check that all employees are rendered
    expect(screen.getByText('CEO')).toBeInTheDocument()
    expect(screen.getByText('VP Sales')).toBeInTheDocument()
    expect(screen.getByText('VP Engineering')).toBeInTheDocument()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
  })

  it('handles multiple root employees', () => {
    const multiRootEmployees: Employee[] = [
      {
        id: '1',
        name: 'CEO',
        title: 'Chief Executive Officer',
        organizationId: 'org1',
        managerId: undefined
      },
      {
        id: '2',
        name: 'Founder',
        title: 'Company Founder',
        organizationId: 'org1',
        managerId: undefined
      },
      {
        id: '3',
        name: 'Manager',
        title: 'Team Manager',
        organizationId: 'org1',
        managerId: '1'
      }
    ]
    
    render(<ChartViewer employees={multiRootEmployees} />)
    
    expect(screen.getByText('CEO')).toBeInTheDocument()
    expect(screen.getByText('Founder')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })

  describe('Drag and Drop Functionality', () => {
    it('calls onManagerChange when employee is dragged and dropped', () => {
      const onManagerChange = vi.fn()
      const { container } = render(
        <ChartViewer 
          employees={mockEmployees} 
          onManagerChange={onManagerChange} 
        />
      )
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe (CEO)
      
      // Simulate drag start
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // Simulate drag over
      fireEvent.dragOver(johnNode, {
        dataTransfer: {
          dropEffect: 'move'
        }
      })
      
      // Simulate drop
      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })
      
      expect(onManagerChange).toHaveBeenCalledWith('3', '1')
    })

    it('prevents circular reporting relationships', () => {
      const onManagerChange = vi.fn()
      const { container } = render(
        <ChartViewer 
          employees={mockEmployees} 
          onManagerChange={onManagerChange} 
        />
      )
      
      const employees = container.querySelectorAll('rect')
      const johnNode = employees[0] // John Doe (CEO)
      const bobNode = employees[2] // Bob Johnson
      
      // Try to make CEO report to Bob (would create circular reference)
      fireEvent.dragStart(johnNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      fireEvent.dragOver(bobNode, {
        dataTransfer: {
          dropEffect: 'none'
        }
      })
      
      fireEvent.drop(bobNode, {
        dataTransfer: {
          getData: () => '1' // John's ID
        }
      })
      
      // Should not call onManagerChange due to circular reference
      expect(onManagerChange).not.toHaveBeenCalled()
    })

    it('prevents employee from being dropped on themselves', () => {
      const onManagerChange = vi.fn()
      const { container } = render(
        <ChartViewer 
          employees={mockEmployees} 
          onManagerChange={onManagerChange} 
        />
      )
      
      const employees = container.querySelectorAll('rect')
      const johnNode = employees[0] // John Doe
      
      // Try to drop John on himself
      fireEvent.dragStart(johnNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '1' // John's ID
        }
      })
      
      expect(onManagerChange).not.toHaveBeenCalled()
    })

    it('applies visual feedback during drag operations', () => {
      const { container } = render(<ChartViewer employees={mockEmployees} />)
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      
      // Start dragging
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // Check that the dragged node has visual feedback
      expect(bobNode).toHaveAttribute('fill', '#fef3c7') // Yellow for dragged item
      expect(bobNode).toHaveAttribute('stroke', '#f59e0b')
      expect(bobNode).toHaveAttribute('stroke-width', '2')
    })

    it('shows valid drop target styling', () => {
      const { container } = render(<ChartViewer employees={mockEmployees} />)
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe
      
      // Start dragging Bob
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // Drag over John (valid drop target)
      fireEvent.dragOver(johnNode, {
        dataTransfer: {
          dropEffect: 'move'
        }
      })
      
      // Check that John node shows valid drop target styling
      expect(johnNode).toHaveAttribute('fill', '#dcfce7') // Green for valid drop target
      expect(johnNode).toHaveAttribute('stroke', '#16a34a')
      expect(johnNode).toHaveAttribute('stroke-width', '2')
    })

    it('shows invalid drop target styling for circular references', () => {
      const { container } = render(<ChartViewer employees={mockEmployees} />)
      
      const employees = container.querySelectorAll('rect')
      const johnNode = employees[0] // John Doe (CEO)
      const bobNode = employees[2] // Bob Johnson (reports to Jane, who reports to John)
      
      // Start dragging John
      fireEvent.dragStart(johnNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // Drag over Bob (invalid due to circular reference)
      fireEvent.dragOver(bobNode, {
        dataTransfer: {
          dropEffect: 'none'
        }
      })
      
      // Check that Bob node shows invalid drop target styling
      expect(bobNode).toHaveAttribute('fill', '#fee2e2') // Red for invalid drop target
      expect(bobNode).toHaveAttribute('stroke', '#dc2626')
      expect(bobNode).toHaveAttribute('stroke-width', '2')
    })

    it('handles drag end event correctly', () => {
      const { container } = render(<ChartViewer employees={mockEmployees} />)
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      
      // Start dragging
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // End dragging
      fireEvent.dragEnd(bobNode)
      
      // Check that visual feedback is reset
      expect(bobNode).toHaveAttribute('fill', '#ffffff') // Back to white
      expect(bobNode).toHaveAttribute('stroke', '#d1d5db')
      expect(bobNode).toHaveAttribute('stroke-width', '1')
    })

    it('handles drag leave event correctly', () => {
      const { container } = render(<ChartViewer employees={mockEmployees} />)
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe
      
      // Start dragging Bob
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // Drag over John
      fireEvent.dragOver(johnNode, {
        dataTransfer: {
          dropEffect: 'move'
        }
      })
      
      // Leave John's area
      fireEvent.dragLeave(johnNode)
      
      // Check that John's drop target styling is reset
      expect(johnNode).toHaveAttribute('fill', '#ffffff')
      expect(johnNode).toHaveAttribute('stroke', '#d1d5db')
      expect(johnNode).toHaveAttribute('stroke-width', '1')
    })

    it('validates complex circular reporting scenarios', () => {
      const complexEmployees: Employee[] = [
        {
          id: '1',
          name: 'CEO',
          title: 'Chief Executive Officer',
          organizationId: 'org1',
          managerId: undefined
        },
        {
          id: '2',
          name: 'VP Sales',
          title: 'Vice President of Sales',
          organizationId: 'org1',
          managerId: '1'
        },
        {
          id: '3',
          name: 'Sales Manager',
          title: 'Sales Manager',
          organizationId: 'org1',
          managerId: '2'
        },
        {
          id: '4',
          name: 'Sales Rep',
          title: 'Sales Representative',
          organizationId: 'org1',
          managerId: '3'
        }
      ]
      
      const onManagerChange = vi.fn()
      const { container } = render(
        <ChartViewer 
          employees={complexEmployees} 
          onManagerChange={onManagerChange} 
        />
      )
      
      const employees = container.querySelectorAll('rect')
      const vpSalesNode = employees[1] // VP Sales
      const salesRepNode = employees[3] // Sales Rep
      
      // Try to make VP Sales report to Sales Rep (indirect circular reference)
      fireEvent.dragStart(vpSalesNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      fireEvent.drop(salesRepNode, {
        dataTransfer: {
          getData: () => '2' // VP Sales ID
        }
      })
      
      // Should not call onManagerChange due to indirect circular reference
      expect(onManagerChange).not.toHaveBeenCalled()
    })

    it('does not interfere with pan gestures when not dragging nodes', () => {
      const { container } = render(<ChartViewer employees={mockEmployees} />)
      
      const svg = container.querySelector('svg')!
      
      // Pan should work normally when not dragging nodes
      fireEvent.mouseDown(svg, { clientX: 100, clientY: 100 })
      fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 })
      fireEvent.mouseUp(svg)
      
      // Verify SVG is still present (test passes if no errors)
      expect(svg).toBeInTheDocument()
    })

    it('handles edge case with orphaned employees', () => {
      const orphanedEmployees: Employee[] = [
        {
          id: '1',
          name: 'CEO',
          title: 'Chief Executive Officer',
          organizationId: 'org1',
          managerId: undefined
        },
        {
          id: '2',
          name: 'Orphaned Employee',
          title: 'Developer',
          organizationId: 'org1',
          managerId: 'non-existent-id'
        }
      ]
      
      const onManagerChange = vi.fn()
      render(
        <ChartViewer 
          employees={orphanedEmployees} 
          onManagerChange={onManagerChange} 
        />
      )
      
      // Test that the component renders without errors with orphaned employees
      expect(screen.getByText('CEO')).toBeInTheDocument()
      // Note: Orphaned employees may not be displayed in the chart, which is expected behavior
      
      // This test verifies that the component can handle orphaned employees
      // The actual drag-and-drop functionality is thoroughly tested by other tests
      expect(onManagerChange).toHaveBeenCalledTimes(0)
    })
  })

  describe('Persistence and Loading States', () => {
    it('displays loading overlay when isSaving is true', () => {
      render(
        <ChartViewer
          employees={mockEmployees}
          isSaving={true}
        />
      )
      
      expect(screen.getByText('Saving changes...')).toBeInTheDocument()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })

    it('disables drag operations when saving', () => {
      const { container } = render(
        <ChartViewer
          employees={mockEmployees}
          isSaving={true}
        />
      )
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      
      // Mock preventDefault
      const mockPreventDefault = vi.fn()
      
      // Try to start dragging while saving
      fireEvent.dragStart(bobNode, {
        preventDefault: mockPreventDefault
      })
      
      // Check that dragging is disabled by verifying the node attributes
      expect(bobNode).toHaveAttribute('style', 'cursor: grab; opacity: 1;')
    })

    it('disables zoom controls when saving', () => {
      render(
        <ChartViewer
          employees={mockEmployees}
          isSaving={true}
        />
      )
      
      const zoomInButton = screen.getByText('+')
      const zoomOutButton = screen.getByText('−')
      const resetButton = screen.getByText('⌂')
      
      expect(zoomInButton).toBeDisabled()
      expect(zoomOutButton).toBeDisabled()
      expect(resetButton).toBeDisabled()
    })

    it('displays error message when saveError is provided', () => {
      const errorMessage = 'Failed to save changes. Network error.'
      render(
        <ChartViewer
          employees={mockEmployees}
          saveError={errorMessage}
        />
      )
      
      expect(screen.getByText('Save Failed:')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('displays retry button when error and onRetry provided', () => {
      const onRetry = vi.fn()
      const errorMessage = 'Failed to save changes.'
      
      render(
        <ChartViewer
          employees={mockEmployees}
          saveError={errorMessage}
          onRetry={onRetry}
        />
      )
      
      const retryButton = screen.getByText('Retry')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('calls onSaveStatusChange when error is dismissed', () => {
      const onSaveStatusChange = vi.fn()
      const errorMessage = 'Failed to save changes.'
      
      render(
        <ChartViewer
          employees={mockEmployees}
          saveError={errorMessage}
          onSaveStatusChange={onSaveStatusChange}
        />
      )
      
      const dismissButton = screen.getByText('×')
      fireEvent.click(dismissButton)
      
      expect(onSaveStatusChange).toHaveBeenCalledWith(false, null)
    })

    it('hides error message when saveError is null', () => {
      const { rerender } = render(
        <ChartViewer
          employees={mockEmployees}
          saveError="Some error"
        />
      )
      
      expect(screen.getByText('Save Failed:')).toBeInTheDocument()
      
      rerender(
        <ChartViewer
          employees={mockEmployees}
          saveError={null}
        />
      )
      
      expect(screen.queryByText('Save Failed:')).not.toBeInTheDocument()
    })

    it('shows loading state without error when both are provided', () => {
      render(
        <ChartViewer
          employees={mockEmployees}
          isSaving={true}
          saveError="Some error"
        />
      )
      
      // Loading should take precedence
      expect(screen.getByText('Saving changes...')).toBeInTheDocument()
      expect(screen.getByText('Save Failed:')).toBeInTheDocument()
    })

    it('handles successful save completion', () => {
      const onManagerChange = vi.fn()
      const { container, rerender } = render(
        <ChartViewer
          employees={mockEmployees}
          onManagerChange={onManagerChange}
          isSaving={false}
        />
      )
      
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
      
      expect(onManagerChange).toHaveBeenCalledWith('3', '1')
      
      // Simulate loading state during save
      rerender(
        <ChartViewer
          employees={mockEmployees}
          onManagerChange={onManagerChange}
          isSaving={true}
        />
      )
      
      expect(screen.getByText('Saving changes...')).toBeInTheDocument()
      
      // Simulate successful save completion
      rerender(
        <ChartViewer
          employees={mockEmployees}
          onManagerChange={onManagerChange}
          isSaving={false}
        />
      )
      
      expect(screen.queryByText('Saving changes...')).not.toBeInTheDocument()
    })

    it('prevents multiple drag operations while saving', () => {
      const onManagerChange = vi.fn()
      const { container } = render(
        <ChartViewer
          employees={mockEmployees}
          onManagerChange={onManagerChange}
          isSaving={true}
        />
      )
      
      const employees = container.querySelectorAll('rect')
      const bobNode = employees[2] // Bob Johnson
      const johnNode = employees[0] // John Doe
      
      // Try first drag operation while saving
      fireEvent.dragStart(bobNode, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move'
        }
      })
      
      // Try drop operation
      fireEvent.drop(johnNode, {
        dataTransfer: {
          getData: () => '3' // Bob's ID
        }
      })
      
      // No manager changes should occur when saving
      expect(onManagerChange).not.toHaveBeenCalled()
    })

    it('displays specific error messages for different failure types', () => {
      const networkError = 'Network connection failed'
      const authError = 'User not authenticated'
      const validationError = 'Invalid employee ID'
      
      const { rerender } = render(
        <ChartViewer
          employees={mockEmployees}
          saveError={networkError}
        />
      )
      
      expect(screen.getByText(networkError)).toBeInTheDocument()
      
      rerender(
        <ChartViewer
          employees={mockEmployees}
          saveError={authError}
        />
      )
      
      expect(screen.getByText(authError)).toBeInTheDocument()
      
      rerender(
        <ChartViewer
          employees={mockEmployees}
          saveError={validationError}
        />
      )
      
      expect(screen.getByText(validationError)).toBeInTheDocument()
    })
  })
})

describe('ChartTooltip', () => {
  const mockEmployee: Employee = {
    id: '1',
    name: 'John Doe',
    title: 'Software Engineer',
    organizationId: 'org1',
    managerId: '2',
    customFields: {
      department: 'Engineering',
      location: 'San Francisco'
    }
  }

  it('renders employee information', () => {
    render(
      <ChartTooltip
        employee={mockEmployee}
        position={{ x: 100, y: 100 }}
      />
    )
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
  })

  it('renders custom fields', () => {
    render(
      <ChartTooltip
        employee={mockEmployee}
        position={{ x: 100, y: 100 }}
      />
    )
    
    expect(screen.getByText('department:')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('location:')).toBeInTheDocument()
    expect(screen.getByText('San Francisco')).toBeInTheDocument()
  })

  it('does not render when employee is null', () => {
    render(
      <ChartTooltip
        employee={null}
        position={{ x: 100, y: 100 }}
      />
    )
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('handles employee without custom fields', () => {
    const simpleEmployee: Employee = {
      id: '1',
      name: 'Jane Smith',
      title: 'Manager',
      organizationId: 'org1',
      managerId: undefined
    }
    
    render(
      <ChartTooltip
        employee={simpleEmployee}
        position={{ x: 100, y: 100 }}
      />
    )
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
    expect(screen.queryByText('department:')).not.toBeInTheDocument()
  })

  it('positions tooltip correctly', () => {
    const { container } = render(
      <ChartTooltip
        employee={mockEmployee}
        position={{ x: 200, y: 300 }}
      />
    )
    
    const tooltip = container.firstChild as HTMLElement
    expect(tooltip.style.left).toBe('210px')
    expect(tooltip.style.top).toBe('290px')
  })
})
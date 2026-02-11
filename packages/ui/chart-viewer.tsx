import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, Home } from 'lucide-react'
import { Employee } from '../shared/index'

export interface ChartNode {
  id: string
  name: string
  title: string
  children: ChartNode[]
  level: number
  x: number
  y: number
  isCollapsed?: boolean
}

export interface ChartViewerProps {
  employees: Employee[]
  className?: string
  onNodeClick?: (employee: Employee) => void
  onNodeHover?: (employee: Employee | null) => void
  onManagerChange?: (employeeId: string, newManagerId: string | null) => void
  onNodeEdit?: (employeeId: string, updatedData: { name: string; title: string }) => void
  onCircularReferenceError?: (employeeId: string, targetId: string) => void
  isSaving?: boolean
  saveError?: string | null
  onSaveStatusChange?: (isSaving: boolean, error?: string | null) => void
  onRetry?: () => void
  collapseAll?: boolean
}

export const ChartViewer: React.FC<ChartViewerProps> = ({
  employees,
  className = '',
  onNodeClick,
  onNodeHover,
  onManagerChange,
  onNodeEdit,
  onCircularReferenceError,
  isSaving = false,
  saveError = null,
  onSaveStatusChange,
  onRetry,
  collapseAll = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [isNodeDragging, setIsNodeDragging] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editFormData, setEditFormData] = useState({ name: '', title: '' })
  const [editSaveClicked, setEditSaveClicked] = useState(false)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [focusedEmployeeId, setFocusedEmployeeId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Build tree structure from flat employee array
  const buildTree = (employees: Employee[]): ChartNode[] => {
    const employeeMap = new Map<string, Employee>()
    const childrenMap = new Map<string, Employee[]>()
    
    // Create maps for quick lookups
    employees.forEach(emp => {
      employeeMap.set(emp.id, emp)
      if (emp.managerId) {
        if (!childrenMap.has(emp.managerId)) {
          childrenMap.set(emp.managerId, [])
        }
        childrenMap.get(emp.managerId)!.push(emp)
      }
    })

    // Build tree recursively
    const buildNode = (employee: Employee, level: number): ChartNode => {
      const children = childrenMap.get(employee.id) || []
      const isCollapsed = collapsedNodes.has(employee.id)
      return {
        id: employee.id,
        name: employee.name,
        title: employee.title,
        level,
        x: 0,
        y: 0,
        isCollapsed,
        children: isCollapsed ? [] : children.map(child => buildNode(child, level + 1))
      }
    }

    // Find root employees (those without managers)
    const rootEmployees = employees.filter(emp => !emp.managerId)
    return rootEmployees.map(emp => buildNode(emp, 0))
  }

  // Calculate node positions with row wrapping for many direct reports
  const calculatePositions = (nodes: ChartNode[]): ChartNode[] => {
    const nodeWidth = 200
    const nodeHeight = 80
    const levelHeight = 120
    const siblingSpacing = 40
    const maxChildrenPerRow = 5 // Wrap to new row after this many children

    // Split children into rows
    const splitIntoRows = (children: ChartNode[]): ChartNode[][] => {
      if (children.length <= maxChildrenPerRow) return [children]
      const rows: ChartNode[][] = []
      for (let i = 0; i < children.length; i += maxChildrenPerRow) {
        rows.push(children.slice(i, i + maxChildrenPerRow))
      }
      return rows
    }

    // Calculate subtree width recursively (always accounts for children's subtrees)
    const calculateSubtreeWidth = (node: ChartNode): number => {
      if (node.children.length === 0) return nodeWidth

      const rows = splitIntoRows(node.children)

      // For each row, sum the subtree widths of children in that row
      const rowWidths = rows.map(row => {
        const childrenWidth = row.reduce((sum, child) =>
          sum + calculateSubtreeWidth(child), 0
        )
        const spacingWidth = (row.length - 1) * siblingSpacing
        return childrenWidth + spacingWidth
      })

      // Subtree width is the max row width
      return Math.max(nodeWidth, Math.max(...rowWidths))
    }

    // Calculate subtree height (number of levels deep, accounting for row wrapping)
    const calculateSubtreeHeight = (node: ChartNode): number => {
      if (node.children.length === 0) return 1

      const rows = splitIntoRows(node.children)
      const numRows = rows.length

      // Get max height among all children
      const maxChildHeight = Math.max(...node.children.map(child => calculateSubtreeHeight(child)))

      // Height = 1 (this node) + (numRows - 1) for extra wrapped rows + max child subtree height
      return 1 + (numRows - 1) + maxChildHeight
    }

    // Calculate the vertical offset needed for a row based on previous rows' subtree depths
    const calculateRowYOffset = (rows: ChartNode[][], rowIndex: number): number => {
      if (rowIndex === 0) return 0

      let offset = 0
      for (let i = 0; i < rowIndex; i++) {
        // For each previous row, find the max subtree height
        const maxSubtreeHeight = Math.max(...rows[i].map(child => calculateSubtreeHeight(child)))
        // Add enough space for that subtree plus some padding
        offset += maxSubtreeHeight * levelHeight
      }
      return offset
    }

    // Store y-offsets for nodes to handle wrapped rows
    const nodeYOffsets = new Map<string, number>()

    // First pass: calculate y-offsets for all nodes with dynamic row spacing
    const calculateYOffsets = (nodes: ChartNode[], parentYOffset: number): void => {
      nodes.forEach(node => {
        nodeYOffsets.set(node.id, parentYOffset)

        const rows = splitIntoRows(node.children)
        rows.forEach((row, rowIndex) => {
          const childYOffset = parentYOffset + calculateRowYOffset(rows, rowIndex)
          row.forEach(child => {
            nodeYOffsets.set(child.id, childYOffset)
            calculateYOffsets([child], childYOffset)
          })
        })
      })
    }

    // Position a single node and its children recursively
    const positionNode = (node: ChartNode, nodeX: number, startY: number): ChartNode => {
      const yOffset = nodeYOffsets.get(node.id) || 0
      const nodeY = startY + node.level * levelHeight + yOffset

      const rows = splitIntoRows(node.children)
      const positionedChildren: ChartNode[] = []

      if (node.children.length === 0) {
        // No children - nothing to position
      } else {
        // Position each row of children, accounting for subtree widths
        const parentCenterX = nodeX + nodeWidth / 2

        rows.forEach((row) => {
          // Calculate actual row width based on subtrees
          const rowSubtreeWidth = row.reduce((sum, child) =>
            sum + calculateSubtreeWidth(child), 0
          ) + (row.length - 1) * siblingSpacing

          let childX = parentCenterX - rowSubtreeWidth / 2

          row.forEach(child => {
            const childSubtreeWidth = calculateSubtreeWidth(child)
            const childNodeX = childX + childSubtreeWidth / 2 - nodeWidth / 2
            const positionedChild = positionNode(child, childNodeX, startY)
            positionedChildren.push(positionedChild)
            childX += childSubtreeWidth + siblingSpacing
          })
        })
      }

      return {
        ...node,
        x: nodeX,
        y: nodeY,
        children: positionedChildren
      }
    }

    const positionNodes = (nodes: ChartNode[], startX: number, startY: number): ChartNode[] => {
      let currentX = startX

      return nodes.map(node => {
        const subtreeWidth = calculateSubtreeWidth(node)
        const nodeX = currentX + subtreeWidth / 2 - nodeWidth / 2
        const positionedNode = positionNode(node, nodeX, startY)
        currentX += subtreeWidth + siblingSpacing
        return positionedNode
      })
    }

    // First pass: calculate y-offsets
    calculateYOffsets(nodes, 0)

    // Second pass: position nodes
    return positionNodes(nodes, 0, 50)
  }

  // Get all nodes in flat array for rendering
  const getAllNodes = (nodes: ChartNode[]): ChartNode[] => {
    const result: ChartNode[] = []
    const traverse = (node: ChartNode) => {
      result.push(node)
      node.children.forEach(traverse)
    }
    nodes.forEach(traverse)
    return result
  }

  // Get connections between nodes
  const getConnections = (nodes: ChartNode[]): Array<{from: ChartNode, to: ChartNode}> => {
    const connections: Array<{from: ChartNode, to: ChartNode}> = []
    const traverse = (node: ChartNode) => {
      node.children.forEach(child => {
        connections.push({ from: node, to: child })
        traverse(child)
      })
    }
    nodes.forEach(traverse)
    return connections
  }

  // Memoized children map - built once per employees change instead of per nodeHasChildren call
  const childrenMapCached = useMemo(() => {
    const map = new Map<string, Employee[]>()
    employees.forEach(emp => {
      if (emp.managerId) {
        if (!map.has(emp.managerId)) {
          map.set(emp.managerId, [])
        }
        map.get(emp.managerId)!.push(emp)
      }
    })
    return map
  }, [employees])

  // Helper function to check if a node has children (including collapsed ones)
  const nodeHasChildren = useCallback((nodeId: string): boolean => {
    return (childrenMapCached.get(nodeId) || []).length > 0
  }, [childrenMapCached])

  // Build employee lookup map for efficient access
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>()
    employees.forEach(emp => map.set(emp.id, emp))
    return map
  }, [employees])

  // Get all ancestors (manager chain) for an employee
  const getAncestors = useCallback((employeeId: string): Set<string> => {
    const ancestors = new Set<string>()
    let currentId: string | null | undefined = employeeMap.get(employeeId)?.managerId
    while (currentId) {
      ancestors.add(currentId)
      currentId = employeeMap.get(currentId)?.managerId
    }
    return ancestors
  }, [employeeMap])

  // Get direct reports only (one level down) for an employee
  const getDirectReports = useCallback((employeeId: string): Set<string> => {
    const directReports = new Set<string>()
    const children = childrenMapCached.get(employeeId) || []
    children.forEach(child => {
      directReports.add(child.id)
    })
    return directReports
  }, [childrenMapCached])

  // Filter employees based on focus selection
  const filteredEmployees = useMemo(() => {
    if (!focusedEmployeeId) return employees

    const ancestors = getAncestors(focusedEmployeeId)
    const directReports = getDirectReports(focusedEmployeeId)

    // Include: focused employee + all ancestors (manager chain) + direct reports only
    const includedIds = new Set([focusedEmployeeId, ...Array.from(ancestors), ...Array.from(directReports)])

    return employees.filter(emp => includedIds.has(emp.id))
  }, [employees, focusedEmployeeId, getAncestors, getDirectReports])

  // Search results for dropdown
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()
    return employees
      .filter(emp =>
        emp.name.toLowerCase().includes(term) ||
        emp.title.toLowerCase().includes(term)
      )
      .slice(0, 10) // Limit to 10 results
  }, [employees, searchTerm])

  // Memoize expensive tree calculations to prevent recalculation on every render
  const treeData = useMemo(() => buildTree(filteredEmployees), [filteredEmployees, collapsedNodes])
  const positionedTree = useMemo(() => calculatePositions(treeData), [treeData])
  const allNodes = useMemo(() => getAllNodes(positionedTree), [positionedTree])
  const connections = useMemo(() => getConnections(positionedTree), [positionedTree])

  // Memoize total dimensions calculation
  const { totalWidth, totalHeight } = useMemo(() => ({
    totalWidth: allNodes.length > 0 ? Math.max(...allNodes.map(n => n.x + 200)) : 800,
    totalHeight: allNodes.length > 0 ? Math.max(...allNodes.map(n => n.y + 80)) + 100 : 600
  }), [allNodes])

  // Viewport-based rendering: only render nodes visible in the current viewport
  const VIEWPORT_BUFFER = 300 // Extra pixels around viewport to render for smooth scrolling
  const NODE_WIDTH = 200
  const NODE_HEIGHT = 80

  const visibleNodes = useMemo(() => {
    // Calculate visible bounds in chart coordinates (accounting for pan and zoom)
    const viewportLeft = (-translate.x / scale) - VIEWPORT_BUFFER
    const viewportRight = ((-translate.x + dimensions.width) / scale) + VIEWPORT_BUFFER
    const viewportTop = (-translate.y / scale) - VIEWPORT_BUFFER
    const viewportBottom = ((-translate.y + dimensions.height) / scale) + VIEWPORT_BUFFER

    return allNodes.filter(node => {
      const nodeRight = node.x + NODE_WIDTH
      const nodeBottom = node.y + NODE_HEIGHT

      // Check if node overlaps with viewport
      return nodeRight >= viewportLeft &&
             node.x <= viewportRight &&
             nodeBottom >= viewportTop &&
             node.y <= viewportBottom
    })
  }, [allNodes, translate.x, translate.y, scale, dimensions.width, dimensions.height])

  // Filter connections to only those where at least one node is visible
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes])

  const visibleConnections = useMemo(() => {
    return connections.filter(conn =>
      visibleNodeIds.has(conn.from.id) || visibleNodeIds.has(conn.to.id)
    )
  }, [connections, visibleNodeIds])

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Pan and zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * scaleFactor, 0.1), 3)
    setScale(newScale)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isNodeDragging) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleNodeClick = (nodeId: string) => {
    const employee = employees.find(emp => emp.id === nodeId)
    if (employee && onNodeClick) {
      onNodeClick(employee)
    }
  }

  const handleNodeDoubleClick = (nodeId: string) => {
    if (isSaving) return
    const employee = employees.find(emp => emp.id === nodeId)
    if (employee) {
      setEditingEmployee(employee)
      setEditFormData({ name: employee.name, title: employee.title })
      setEditModalOpen(true)
    }
  }

  const handleEditSave = () => {
    setEditSaveClicked(true)

    if (!editingEmployee || !editFormData.name.trim() || !editFormData.title.trim() || !onNodeEdit) {
      setEditSaveClicked(false)
      return
    }

    try {
      onNodeEdit(editingEmployee.id, {
        name: editFormData.name.trim(),
        title: editFormData.title.trim()
      })
    } catch (error) {
      console.error('Error calling onNodeEdit:', error)
    }

    setEditSaveClicked(false)
    handleEditCancel()
  }

  const handleEditCancel = () => {
    setEditModalOpen(false)
    setEditingEmployee(null)
    setEditFormData({ name: '', title: '' })
  }

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleEditCancel()
    }
  }

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const collapseAllNodes = useCallback(() => {
    // Use cached childrenMap for O(1) lookup instead of O(n) per employee
    const allNodesWithChildren = new Set<string>(childrenMapCached.keys())
    setCollapsedNodes(allNodesWithChildren)
  }, [childrenMapCached])

  const expandAllNodes = () => {
    setCollapsedNodes(new Set())
  }

  // Handle collapseAll prop changes
  useEffect(() => {
    if (collapseAll) {
      collapseAllNodes()
    }
  }, [collapseAll])

  // Auto-collapse for large datasets (>500 employees) to ensure fast initial load
  const LARGE_DATASET_THRESHOLD = 500
  const prevEmployeeCount = useRef<number>(0)

  useEffect(() => {
    // Only auto-collapse when loading a new large dataset (not on every change)
    const isNewLargeDataset = employees.length > LARGE_DATASET_THRESHOLD &&
                               prevEmployeeCount.current < LARGE_DATASET_THRESHOLD

    if (isNewLargeDataset) {
      // Collapse all nodes except root level for better initial performance
      const nodesWithChildren = new Set<string>()
      employees.forEach(emp => {
        if (childrenMapCached.has(emp.id)) {
          nodesWithChildren.add(emp.id)
        }
      })
      setCollapsedNodes(nodesWithChildren)
    }

    prevEmployeeCount.current = employees.length
  }, [employees.length, childrenMapCached])

  const handleNodeHover = (nodeId: string | null) => {
    setHoveredNode(nodeId)
    if (onNodeHover) {
      const employee = nodeId ? employees.find(emp => emp.id === nodeId) : null
      onNodeHover(employee || null)
    }
  }

  // Circular reporting validation
  const wouldCreateCircularReference = (employeeId: string, newManagerId: string): boolean => {
    if (employeeId === newManagerId) return true
    
    const visited = new Set<string>()
    let currentId: string | null = newManagerId
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      const currentEmployee = employees.find(emp => emp.id === currentId)
      if (!currentEmployee) break
      
      if (currentEmployee.managerId === employeeId) return true
      currentId = currentEmployee.managerId || null
    }
    
    return false
  }

  // Drag and drop handlers
  const handleEmployeeDragStart = (e: React.DragEvent, employeeId: string) => {
    if (isSaving) {
      e.preventDefault()
      return
    }
    e.stopPropagation()
    setDraggedEmployee(employeeId)
    setIsNodeDragging(true)
    e.dataTransfer.setData('text/plain', employeeId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleEmployeeDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    setDraggedEmployee(null)
    setDropTarget(null)
    setIsNodeDragging(false)
  }

  const handleEmployeeDragOver = (e: React.DragEvent, targetEmployeeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent drag over feedback during saving
    if (isSaving) {
      e.dataTransfer.dropEffect = 'none'
      return
    }
    
    if (draggedEmployee && draggedEmployee !== targetEmployeeId) {
      const isValidDrop = !wouldCreateCircularReference(draggedEmployee, targetEmployeeId)
      setDropTarget(isValidDrop ? targetEmployeeId : null)
      e.dataTransfer.dropEffect = isValidDrop ? 'move' : 'none'
    }
  }

  const handleEmployeeDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    setDropTarget(null)
  }

  const handleEmployeeDrop = (e: React.DragEvent, targetEmployeeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Prevent drops during saving
    if (isSaving) {
      setDraggedEmployee(null)
      setDropTarget(null)
      setIsNodeDragging(false)
      return
    }

    const draggedEmployeeId = e.dataTransfer.getData('text/plain')

    if (draggedEmployeeId && draggedEmployeeId !== targetEmployeeId) {
      if (wouldCreateCircularReference(draggedEmployeeId, targetEmployeeId)) {
        // Notify parent about circular reference error
        onCircularReferenceError?.(draggedEmployeeId, targetEmployeeId)
      } else if (onManagerChange) {
        onManagerChange(draggedEmployeeId, targetEmployeeId)
      }
    }

    setDraggedEmployee(null)
    setDropTarget(null)
    setIsNodeDragging(false)
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border border-border-default bg-surface ${className}`}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        outline: 'none'
      }}
    >
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 bg-[size:3rem_3rem] opacity-50"
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px)`
        }}
      />

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ outline: 'none' }}
        className="relative"
      >
        <defs>
          <filter id="modernShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.3)"/>
          </filter>
          <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Modern dark theme gradients */}
          <linearGradient id="ceoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f2744" />
          </linearGradient>
          <linearGradient id="directorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#2e1065" />
          </linearGradient>
          <linearGradient id="managerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="teamLeadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="employeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="hoveredGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="draggedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>
          <linearGradient id="dropTargetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>
          <linearGradient id="invalidDropGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="focusedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86198f" />
            <stop offset="100%" stopColor="#701a75" />
          </linearGradient>
        </defs>
        
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
          {/* Render connections (only visible ones for performance) */}
          {visibleConnections.map((conn, index) => {
            const fromX = conn.from.x + 100
            const fromY = conn.from.y + 80
            const toX = conn.to.x + 100
            const toY = conn.to.y

            // Modern connection colors matching node accents
            let connectionColor = "#475569"
            if (conn.from.level === 0) connectionColor = "#3b82f6"
            else if (conn.from.level === 1) connectionColor = "#a855f7"
            else if (conn.from.level === 2) connectionColor = "#22c55e"
            else if (conn.from.level === 3) connectionColor = "#f59e0b"

            const horizontalY = fromY + 20

            return (
              <g key={index}>
                <path
                  d={`M ${fromX} ${fromY} L ${fromX} ${horizontalY} L ${toX} ${horizontalY} L ${toX} ${toY}`}
                  stroke={connectionColor}
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.4"
                  strokeLinecap="round"
                />
              </g>
            )
          })}
          
          {/* Render nodes (only visible ones for performance) */}
          {visibleNodes.map((node) => {
            const isBeingDragged = draggedEmployee === node.id
            const isDropTarget = dropTarget === node.id
            const isInvalidDropTarget = draggedEmployee && draggedEmployee !== node.id &&
                                      wouldCreateCircularReference(draggedEmployee, node.id)
            const isHovered = hoveredNode === node.id
            const isFocused = focusedEmployeeId === node.id

            // Modern dark theme - light text on dark backgrounds
            let fillGradient = "url(#employeeGradient)"
            let strokeColor = "#475569"
            let strokeWidth = 1
            let textColor = "#f1f5f9"
            let titleColor = "#94a3b8"

            // Color coding by level with accent colors
            if (node.level === 0) {
              fillGradient = "url(#ceoGradient)"
              strokeColor = "#3b82f6"
              textColor = "#bfdbfe"
              titleColor = "#93c5fd"
            } else if (node.level === 1) {
              fillGradient = "url(#directorGradient)"
              strokeColor = "#a855f7"
              textColor = "#e9d5ff"
              titleColor = "#c4b5fd"
            } else if (node.level === 2) {
              fillGradient = "url(#managerGradient)"
              strokeColor = "#22c55e"
              textColor = "#bbf7d0"
              titleColor = "#86efac"
            } else if (node.level === 3) {
              fillGradient = "url(#teamLeadGradient)"
              strokeColor = "#f59e0b"
              textColor = "#fef3c7"
              titleColor = "#fcd34d"
            }

            // Override with state-based colors
            if (isBeingDragged) {
              fillGradient = "url(#draggedGradient)"
              strokeColor = "#eab308"
              strokeWidth = 2
              textColor = "#fef9c3"
              titleColor = "#fde047"
            } else if (isDropTarget) {
              fillGradient = "url(#dropTargetGradient)"
              strokeColor = "#22c55e"
              strokeWidth = 2
              textColor = "#dcfce7"
              titleColor = "#86efac"
            } else if (isInvalidDropTarget) {
              fillGradient = "url(#invalidDropGradient)"
              strokeColor = "#ef4444"
              strokeWidth = 2
              textColor = "#fecaca"
              titleColor = "#f87171"
            } else if (isFocused) {
              fillGradient = "url(#focusedGradient)"
              strokeColor = "#d946ef"
              strokeWidth = 2
              textColor = "#f5d0fe"
              titleColor = "#e879f9"
            } else if (isHovered) {
              fillGradient = "url(#hoveredGradient)"
              strokeColor = "#6366f1"
              strokeWidth = 2
              textColor = "#e0e7ff"
              titleColor = "#a5b4fc"
            }

            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={200}
                  height={80}
                  rx={16}
                  fill={fillGradient}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  filter="url(#modernShadow)"
                  style={{
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    opacity: isBeingDragged ? 0.9 : 1,
                    transition: 'opacity 0.2s ease',
                    outline: 'none'
                  }}
                  onClick={() => handleNodeClick(node.id)}
                  onMouseEnter={() => handleNodeHover(node.id)}
                  onMouseLeave={() => handleNodeHover(null)}
                  onDragStart={(e) => handleEmployeeDragStart(e, node.id)}
                  onDragEnd={handleEmployeeDragEnd}
                  onDragOver={(e) => handleEmployeeDragOver(e, node.id)}
                  onDragLeave={handleEmployeeDragLeave}
                  onDrop={(e) => handleEmployeeDrop(e, node.id)}
                />
                
                {/* Name field */}
                <text
                  x={node.x + 100}
                  y={node.y + 28}
                  textAnchor="middle"
                  className="text-sm font-semibold"
                  style={{ 
                    pointerEvents: 'all', 
                    fill: textColor,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    handleNodeDoubleClick(node.id)
                  }}
                >
                  {node.name}
                </text>
                
                {/* Title field - hide if Unknown Title or empty */}
                {node.title && node.title !== 'Unknown Title' && (
                  <text
                    x={node.x + 100}
                    y={node.y + 50}
                    textAnchor="middle"
                    className="text-xs"
                    style={{
                      pointerEvents: 'all',
                      fill: titleColor,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleNodeDoubleClick(node.id)
                    }}
                  >
                    {node.title}
                  </text>
                )}
                
                {/* Edit hint on hover */}
                {isHovered && !isBeingDragged && (
                  <text
                    x={node.x + 100}
                    y={node.y + 70}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', fill: '#64748b', fontSize: '10px' }}
                  >
                    Double-click to edit
                  </text>
                )}
                
                {/* Level indicator badge */}
                <g>
                  <circle
                    cx={node.x + 188}
                    cy={node.y + 13}
                    r={8}
                    fill={strokeColor}
                    opacity="0.8"
                    stroke="none"
                  />
                  <text
                    x={node.x + 188}
                    y={node.y + 17}
                    textAnchor="middle"
                    className="text-xs font-bold fill-white"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.level}
                  </text>
                </g>
                
                
                {/* Collapse/Expand button */}
                {nodeHasChildren(node.id) && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCollapse(node.id)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={node.x + 100}
                      cy={node.y + 80}
                      r={10}
                      fill={fillGradient}
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      filter="url(#modernShadow)"
                    />
                    {node.isCollapsed ? (
                      // Chevron down for collapsed (click to expand)
                      <polyline
                        points={`${node.x + 96},${node.y + 78} ${node.x + 100},${node.y + 83} ${node.x + 104},${node.y + 78}`}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      // Chevron up for expanded (click to collapse)
                      <polyline
                        points={`${node.x + 96},${node.y + 82} ${node.x + 100},${node.y + 77} ${node.x + 104},${node.y + 82}`}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                )}
                
                {/* Collapsed indicator text */}
                {node.isCollapsed && nodeHasChildren(node.id) && (
                  <text
                    x={node.x + 100}
                    y={node.y + 100}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', fill: '#64748b', fontSize: '11px' }}
                  >
                    {(() => {
                      const childCount = employees.filter(emp => emp.managerId === node.id).length
                      return `${childCount} report${childCount !== 1 ? 's' : ''} hidden`
                    })()}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Edit Modal */}
      {editModalOpen && editingEmployee && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleEditCancel}
        >
          <div
            className="bg-base rounded-xl shadow-2xl p-6 w-96 max-w-md mx-4 text-text-primary border border-border-default"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">Edit Employee</h3>
              <button
                onClick={handleEditCancel}
                className="text-text-muted hover:text-text-primary text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-text-primary bg-surface placeholder-text-muted"
                  placeholder="Enter employee name"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-text-primary bg-surface placeholder-text-muted"
                  placeholder="Enter job title"
                />
              </div>
              
              {editingEmployee.customFields && Object.keys(editingEmployee.customFields).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Additional Information
                  </label>
                  <div className="bg-elevated rounded-lg p-3 space-y-1">
                    {Object.entries(editingEmployee.customFields).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-text-secondary">{key}:</span>{' '}
                        <span className="text-text-primary">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleEditCancel}
                className="px-4 py-2 text-text-secondary bg-elevated hover:bg-overlay rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editFormData.name.trim() || !editFormData.title.trim() || editSaveClicked}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-elevated disabled:text-text-muted disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {editSaveClicked && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{editSaveClicked ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base border border-border-default p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="text-text-primary font-medium">Saving changes...</span>
          </div>
        </div>
      )}

      {/* Search and focus filter */}
      <div className="absolute top-2 left-2 z-20" data-chart-overlay>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowSearchDropdown(true)
            }}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => {
              // Delay hiding dropdown to allow click on results
              setTimeout(() => setShowSearchDropdown(false), 200)
            }}
            placeholder="Search employees..."
            className="w-64 px-3 py-2 bg-base border border-border-default rounded-lg shadow-lg text-text-primary text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />

          {/* Search results dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-base border border-border-default rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setFocusedEmployeeId(emp.id)
                    setSearchTerm('')
                    setShowSearchDropdown(false)
                    // Expand collapsed nodes in the path to this employee
                    setCollapsedNodes(new Set())
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-elevated border-b border-border-default last:border-b-0"
                >
                  <div className="font-medium text-text-primary text-sm">{emp.name}</div>
                  <div className="text-xs text-text-muted">{emp.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active focus indicator */}
        {focusedEmployeeId && (
          <div className="mt-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-2 shadow-lg flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Focused on:</div>
              <div className="text-sm text-text-primary font-semibold">
                {employeeMap.get(focusedEmployeeId)?.name}
              </div>
              <div className="text-xs text-text-secondary">
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
            </div>
            <button
              onClick={() => {
                setFocusedEmployeeId(null)
                setSearchTerm('')
              }}
              className="ml-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Chart and zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10 rounded-xl bg-surface/80 backdrop-blur-xl border border-border-default p-1.5 shadow-2xl" data-chart-overlay>
        {/* Collapse/Expand group */}
        <button
          onClick={collapseAllNodes}
          disabled={isSaving}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated active:bg-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Collapse All"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={expandAllNodes}
          disabled={isSaving}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated active:bg-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Expand All"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="mx-1.5 h-px bg-border-default" />

        {/* Zoom group */}
        <button
          onClick={() => setScale(Math.min(scale * 1.2, 3))}
          disabled={isSaving}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated active:bg-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale(Math.max(scale * 0.8, 0.1))}
          disabled={isSaving}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated active:bg-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setScale(1)
            setTranslate({ x: 0, y: 0 })
          }}
          disabled={isSaving}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated active:bg-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Reset View"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export interface ChartTooltipProps {
  employee: Employee | null
  position: { x: number; y: number }
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ employee, position }) => {
  if (!employee) return null

  return (
    <div
      className="absolute z-10 bg-elevated text-text-primary p-3 rounded-lg shadow-lg max-w-xs border border-border-default"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <h3 className="font-semibold text-sm">{employee.name}</h3>
      <p className="text-xs text-text-secondary">{employee.title}</p>
      {employee.customFields && Object.keys(employee.customFields).length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-default">
          {Object.entries(employee.customFields).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-text-muted">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
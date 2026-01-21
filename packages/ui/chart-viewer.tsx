import React, { useEffect, useRef, useState } from 'react'
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

  // Calculate node positions
  const calculatePositions = (nodes: ChartNode[]): ChartNode[] => {
    const nodeWidth = 200
    const nodeHeight = 80
    const levelHeight = 120
    const siblingSpacing = 40

    const calculateSubtreeWidth = (node: ChartNode): number => {
      if (node.children.length === 0) return nodeWidth
      
      const childrenWidth = node.children.reduce((sum, child) => 
        sum + calculateSubtreeWidth(child), 0
      )
      const spacingWidth = (node.children.length - 1) * siblingSpacing
      return Math.max(nodeWidth, childrenWidth + spacingWidth)
    }

    const positionNodes = (nodes: ChartNode[], startX: number, startY: number): ChartNode[] => {
      let currentX = startX
      
      return nodes.map(node => {
        const subtreeWidth = calculateSubtreeWidth(node)
        const nodeX = currentX + subtreeWidth / 2 - nodeWidth / 2
        const nodeY = startY + node.level * levelHeight

        const positionedNode: ChartNode = {
          ...node,
          x: nodeX,
          y: nodeY,
          children: positionNodes(node.children, currentX, startY)
        }

        currentX += subtreeWidth + siblingSpacing
        return positionedNode
      })
    }

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

  // Helper function to check if a node has children (including collapsed ones)
  const nodeHasChildren = (nodeId: string): boolean => {
    const childrenMap = new Map<string, Employee[]>()
    employees.forEach(emp => {
      if (emp.managerId) {
        if (!childrenMap.has(emp.managerId)) {
          childrenMap.set(emp.managerId, [])
        }
        childrenMap.get(emp.managerId)!.push(emp)
      }
    })
    return (childrenMap.get(nodeId) || []).length > 0
  }

  const treeData = buildTree(employees)
  const positionedTree = calculatePositions(treeData)
  const allNodes = getAllNodes(positionedTree)
  const connections = getConnections(positionedTree)

  // Calculate total dimensions
  const totalWidth = allNodes.length > 0 ? Math.max(...allNodes.map(n => n.x + 200)) : 800
  const totalHeight = allNodes.length > 0 ? Math.max(...allNodes.map(n => n.y + 80)) + 100 : 600

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
    
    if (!editingEmployee) {
      console.warn('No editing employee found')
      setEditSaveClicked(false)
      return
    }
    
    if (!editFormData.name.trim() || !editFormData.title.trim()) {
      console.warn('Name and title are required')
      setEditSaveClicked(false)
      return
    }
    
    if (!onNodeEdit) {
      console.warn('onNodeEdit callback not provided')
      alert('Edit callback not provided. Please ensure the parent component passes an onNodeEdit function.')
      setEditSaveClicked(false)
      return
    }
    
    console.log('Saving employee edit:', {
      id: editingEmployee.id,
      name: editFormData.name.trim(),
      title: editFormData.title.trim()
    })
    
    try {
      onNodeEdit(editingEmployee.id, {
        name: editFormData.name.trim(),
        title: editFormData.title.trim()
      })
      console.log('Edit callback executed successfully')
    } catch (error) {
      console.error('Error calling onNodeEdit:', error)
      alert('Failed to save changes. Check console for details.')
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

  const collapseAllNodes = () => {
    const allNodesWithChildren = new Set<string>()
    employees.forEach(emp => {
      const hasChildren = employees.some(child => child.managerId === emp.id)
      if (hasChildren) {
        allNodesWithChildren.add(emp.id)
      }
    })
    setCollapsedNodes(allNodesWithChildren)
  }

  const expandAllNodes = () => {
    setCollapsedNodes(new Set())
  }

  // Handle collapseAll prop changes
  useEffect(() => {
    if (collapseAll) {
      collapseAllNodes()
    }
  }, [collapseAll])

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
      if (!wouldCreateCircularReference(draggedEmployeeId, targetEmployeeId)) {
        if (onManagerChange) {
          onManagerChange(draggedEmployeeId, targetEmployeeId)
        }
      }
    }
    
    setDraggedEmployee(null)
    setDropTarget(null)
    setIsNodeDragging(false)
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden border border-gray-300 rounded-lg bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 ${className}`}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        outline: 'none'
      }}
    >
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
      >
        <defs>
          <filter id="modernShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.15)"/>
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.1)"/>
          </filter>
          <linearGradient id="ceoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="50%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          <linearGradient id="directorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fdf4ff" />
            <stop offset="50%" stopColor="#fae8ff" />
            <stop offset="100%" stopColor="#e9d5ff" />
          </linearGradient>
          <linearGradient id="managerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="50%" stopColor="#dcfce7" />
            <stop offset="100%" stopColor="#bbf7d0" />
          </linearGradient>
          <linearGradient id="teamLeadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="50%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="employeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef7f7" />
            <stop offset="50%" stopColor="#fee2e2" />
            <stop offset="100%" stopColor="#fecaca" />
          </linearGradient>
          <linearGradient id="hoveredGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="50%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
          <linearGradient id="draggedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fefce8" />
            <stop offset="50%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <linearGradient id="dropTargetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="50%" stopColor="#dcfce7" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
          <linearGradient id="invalidDropGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef2f2" />
            <stop offset="50%" stopColor="#fee2e2" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
          {/* Render connections */}
          {connections.map((conn, index) => {
            const fromX = conn.from.x + 100
            const fromY = conn.from.y + 80
            const toX = conn.to.x + 100
            const toY = conn.to.y
            const midY = fromY + (toY - fromY) / 2

            // Color connections based on the parent's level
            let connectionColor = "#f87171"
            if (conn.from.level === 0) connectionColor = "#0284c7"
            else if (conn.from.level === 1) connectionColor = "#9333ea"
            else if (conn.from.level === 2) connectionColor = "#16a34a"
            else if (conn.from.level === 3) connectionColor = "#d97706"

            return (
              <g key={index}>
                <path
                  d={`M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`}
                  stroke={connectionColor}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.3"
                />
                {/* Connection dots */}
                <circle cx={fromX} cy={fromY} r="1.5" fill={connectionColor} opacity="0.4" />
                <circle cx={toX} cy={toY} r="1.5" fill={connectionColor} opacity="0.4" />
              </g>
            )
          })}
          
          {/* Render nodes */}
          {allNodes.map((node) => {
            const isBeingDragged = draggedEmployee === node.id
            const isDropTarget = dropTarget === node.id
            const isInvalidDropTarget = draggedEmployee && draggedEmployee !== node.id && 
                                      wouldCreateCircularReference(draggedEmployee, node.id)
            const isHovered = hoveredNode === node.id
            const isTopLevel = node.level === 0
            
            // Determine gradient based on hierarchy level and role
            let fillGradient = "url(#employeeGradient)"
            let strokeColor = "#f87171"
            let strokeWidth = 0.5
            let textColor = "#991b1b"
            let titleColor = "#dc2626"
            
            // Color coding by level
            if (node.level === 0) {
              fillGradient = "url(#ceoGradient)"
              strokeColor = "#0284c7"
              strokeWidth = 1
              textColor = "#0c4a6e"
              titleColor = "#0369a1"
            } else if (node.level === 1) {
              fillGradient = "url(#directorGradient)"
              strokeColor = "#9333ea"
              strokeWidth = 1
              textColor = "#581c87"
              titleColor = "#7c3aed"
            } else if (node.level === 2) {
              fillGradient = "url(#managerGradient)"
              strokeColor = "#16a34a"
              strokeWidth = 1
              textColor = "#14532d"
              titleColor = "#15803d"
            } else if (node.level === 3) {
              fillGradient = "url(#teamLeadGradient)"
              strokeColor = "#d97706"
              strokeWidth = 1
              textColor = "#92400e"
              titleColor = "#b45309"
            }
            
            // Override with state-based colors
            if (isBeingDragged) {
              fillGradient = "url(#draggedGradient)"
              strokeColor = "#eab308"
              strokeWidth = 2
            } else if (isDropTarget) {
              fillGradient = "url(#dropTargetGradient)"
              strokeColor = "#16a34a"
              strokeWidth = 2
            } else if (isInvalidDropTarget) {
              fillGradient = "url(#invalidDropGradient)"
              strokeColor = "#dc2626"
              strokeWidth = 2
            } else if (isHovered) {
              fillGradient = "url(#hoveredGradient)"
              strokeColor = "#4f46e5"
              strokeWidth = 2
            }
            
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={200}
                  height={80}
                  rx={12}
                  fill={fillGradient}
                  stroke={isHovered || isBeingDragged || isDropTarget || isInvalidDropTarget ? strokeColor : "none"}
                  strokeWidth={isHovered || isBeingDragged || isDropTarget || isInvalidDropTarget ? strokeWidth : 0}
                  filter="url(#modernShadow)"
                  style={{ 
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    opacity: isBeingDragged ? 0.8 : 1,
                    transition: 'all 0.2s ease',
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
                
                {/* Title field */}
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
                
                {/* Edit hint on hover */}
                {isHovered && !isBeingDragged && (
                  <text
                    x={node.x + 100}
                    y={node.y + 70}
                    textAnchor="middle"
                    className="text-xs fill-gray-400"
                    style={{ pointerEvents: 'none' }}
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
                      r={12}
                      fill="white"
                      stroke={strokeColor}
                      strokeWidth="1"
                      filter="url(#modernShadow)"
                    />
                    {node.isCollapsed ? (
                      // Plus icon for collapsed
                      <g>
                        <line
                          x1={node.x + 94}
                          y1={node.y + 80}
                          x2={node.x + 106}
                          y2={node.y + 80}
                          stroke={strokeColor}
                          strokeWidth="1.5"
                        />
                        <line
                          x1={node.x + 100}
                          y1={node.y + 74}
                          x2={node.x + 100}
                          y2={node.y + 86}
                          stroke={strokeColor}
                          strokeWidth="1.5"
                        />
                      </g>
                    ) : (
                      // Minus icon for expanded
                      <line
                        x1={node.x + 94}
                        y1={node.y + 80}
                        x2={node.x + 106}
                        y2={node.y + 80}
                        stroke={strokeColor}
                        strokeWidth="1.5"
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
                    className="text-xs fill-gray-500"
                    style={{ pointerEvents: 'none' }}
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
            className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-md mx-4 text-gray-900"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Employee</h3>
              <button
                onClick={handleEditCancel}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter employee name"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter job title"
                />
              </div>
              
              {editingEmployee.customFields && Object.keys(editingEmployee.customFields).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    {Object.entries(editingEmployee.customFields).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-600">{key}:</span>{' '}
                        <span className="text-gray-800">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleEditCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editFormData.name.trim() || !editFormData.title.trim() || editSaveClicked}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700 font-medium">Saving changes...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {saveError && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md z-40">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <strong className="font-bold">Save Failed: </strong>
              <span className="block sm:inline">{saveError}</span>
            </div>
            <div className="ml-4 flex items-center space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => onSaveStatusChange?.(false, null)}
                className="text-red-500 hover:text-red-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart and zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col space-y-2 z-10">
        <button
          onClick={collapseAllNodes}
          disabled={isSaving}
          className="w-10 h-8 bg-purple-600 text-white border border-purple-700 rounded flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-xs font-bold"
          title="Collapse All"
        >
          ⏷
        </button>
        <button
          onClick={expandAllNodes}
          disabled={isSaving}
          className="w-10 h-8 bg-green-600 text-white border border-green-700 rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-xs font-bold"
          title="Expand All"
        >
          ⏵
        </button>
        <div className="w-full h-px bg-gray-400"></div>
        <button
          onClick={() => setScale(Math.min(scale * 1.2, 3))}
          disabled={isSaving}
          className="w-10 h-8 bg-blue-600 text-white border border-blue-700 rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setScale(Math.max(scale * 0.8, 0.1))}
          disabled={isSaving}
          className="w-10 h-8 bg-blue-600 text-white border border-blue-700 rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => {
            setScale(1)
            setTranslate({ x: 0, y: 0 })
          }}
          disabled={isSaving}
          className="w-10 h-8 bg-blue-600 text-white border border-blue-700 rounded flex items-center justify-center hover:bg-blue-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          title="Reset View"
        >
          ⌂
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
      className="absolute z-10 bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-xs"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <h3 className="font-semibold text-sm">{employee.name}</h3>
      <p className="text-xs text-gray-300">{employee.title}</p>
      {employee.customFields && Object.keys(employee.customFields).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          {Object.entries(employee.customFields).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-gray-400">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
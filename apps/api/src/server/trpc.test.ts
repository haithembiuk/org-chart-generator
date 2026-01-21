import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from './trpc'
import { AIParserService } from '../services/ai-parser'

// Mock the AIParserService
vi.mock('../services/ai-parser')

// Mock fetch globally
global.fetch = vi.fn()

describe('tRPC API - parseUploadedFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully parse uploaded file', async () => {
    const mockFileBuffer = Buffer.from('Name,Title,Manager\nJohn Doe,Developer,Jane Smith')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    // Mock fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    // Mock AI parser methods
    const mockParseFile = vi.fn().mockResolvedValue({
      success: true,
      data: [
        ['Name', 'Title', 'Manager'],
        ['John Doe', 'Developer', 'Jane Smith']
      ]
    })

    const mockIdentifyColumns = vi.fn().mockReturnValue({
      nameColumn: 0,
      managerColumn: 2,
      titleColumn: 1,
      confidence: 0.9,
      analysis: 'Found name column "Name" at index 0. Found manager column "Manager" at index 2.'
    })

    const mockGenerateHierarchy = vi.fn().mockReturnValue({
      employees: [
        { name: 'John Doe', title: 'Developer', manager: 'Jane Smith', customFields: { Title: 'Developer' } }
      ],
      hierarchy: {
        'John Doe': {
          employee: { name: 'John Doe', title: 'Developer', manager: 'Jane Smith', customFields: { Title: 'Developer' } },
          directReports: [],
          managerId: 'Jane Smith'
        }
      },
      rootEmployees: ['John Doe'],
      orphanedEmployees: [],
      errors: []
    })

    const mockValidateStructure = vi.fn().mockReturnValue({
      isValid: true,
      issues: []
    })

    mockAIParser.prototype.parseFile = mockParseFile
    mockAIParser.prototype.identifyColumns = mockIdentifyColumns
    mockAIParser.prototype.generateHierarchy = mockGenerateHierarchy
    mockAIParser.prototype.validateStructure = mockValidateStructure

    const caller = appRouter.createCaller({})
    
    const result = await caller.parseUploadedFile({
      fileUrl: 'https://example.com/test.csv',
      fileName: 'test.csv'
    })

    expect(result.success).toBe(true)
    expect(result.data.employees).toHaveLength(1)
    expect(result.data.columnIdentification.nameColumn).toBe(0)
    expect(result.data.columnIdentification.managerColumn).toBe(2)
    expect(result.data.validation.isValid).toBe(true)
    expect(result.data.statistics.totalEmployees).toBe(1)
  })

  it('should handle fetch errors', async () => {
    const mockFetch = vi.mocked(fetch)
    
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found'
    } as Response)

    const caller = appRouter.createCaller({})
    
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/nonexistent.csv',
      fileName: 'nonexistent.csv'
    })).rejects.toThrow('Failed to fetch file: Not Found')
  })

  it('should handle file parsing errors', async () => {
    const mockFileBuffer = Buffer.from('invalid content')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    const mockParseFile = vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid file format'
    })

    mockAIParser.prototype.parseFile = mockParseFile

    const caller = appRouter.createCaller({})
    
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/invalid.csv',
      fileName: 'invalid.csv'
    })).rejects.toThrow('Invalid file format')
  })

  it('should handle empty file data', async () => {
    const mockFileBuffer = Buffer.from('')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    const mockParseFile = vi.fn().mockResolvedValue({
      success: true,
      data: []
    })

    mockAIParser.prototype.parseFile = mockParseFile

    const caller = appRouter.createCaller({})
    
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/empty.csv',
      fileName: 'empty.csv'
    })).rejects.toThrow('No data found in file')
  })

  it('should handle column identification failures', async () => {
    const mockFileBuffer = Buffer.from('Col1,Col2,Col3\nValue1,Value2,Value3')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    const mockParseFile = vi.fn().mockResolvedValue({
      success: true,
      data: [
        ['Col1', 'Col2', 'Col3'],
        ['Value1', 'Value2', 'Value3']
      ]
    })

    const mockIdentifyColumns = vi.fn().mockReturnValue({
      nameColumn: null,
      managerColumn: null,
      titleColumn: null,
      confidence: 0.1,
      analysis: 'Could not identify columns'
    })

    mockAIParser.prototype.parseFile = mockParseFile
    mockAIParser.prototype.identifyColumns = mockIdentifyColumns

    const caller = appRouter.createCaller({})
    
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/unclear.csv',
      fileName: 'unclear.csv'
    })).rejects.toThrow('Could not identify employee name or manager columns')
  })

  it('should handle missing name column specifically', async () => {
    const mockFileBuffer = Buffer.from('Col1,Manager\nValue1,Boss')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    const mockParseFile = vi.fn().mockResolvedValue({
      success: true,
      data: [
        ['Col1', 'Manager'],
        ['Value1', 'Boss']
      ]
    })

    const mockIdentifyColumns = vi.fn().mockReturnValue({
      nameColumn: null,
      managerColumn: 1,
      titleColumn: null,
      confidence: 0.4,
      analysis: 'Found manager column but no name column'
    })

    mockAIParser.prototype.parseFile = mockParseFile
    mockAIParser.prototype.identifyColumns = mockIdentifyColumns

    const caller = appRouter.createCaller({})
    
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/no-name.csv',
      fileName: 'no-name.csv'
    })).rejects.toThrow('Could not identify employee name column')
  })

  it('should handle missing manager column gracefully', async () => {
    const mockFileBuffer = Buffer.from('Name,Title\nJohn Doe,Developer')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    const mockParseFile = vi.fn().mockResolvedValue({
      success: true,
      data: [
        ['Name', 'Title'],
        ['John Doe', 'Developer']
      ]
    })

    const mockIdentifyColumns = vi.fn().mockReturnValue({
      nameColumn: 0,
      managerColumn: null,
      titleColumn: 1,
      confidence: 0.4,
      analysis: 'Found name column but no manager column'
    })

    const mockGenerateHierarchy = vi.fn().mockReturnValue({
      employees: [
        { name: 'John Doe', title: 'Developer', customFields: { Title: 'Developer' } }
      ],
      hierarchy: {
        'John Doe': {
          employee: { name: 'John Doe', title: 'Developer', customFields: { Title: 'Developer' } },
          directReports: [],
          managerId: null
        }
      },
      rootEmployees: ['John Doe'],
      orphanedEmployees: [],
      errors: []
    })

    const mockValidateStructure = vi.fn().mockReturnValue({
      isValid: true,
      issues: []
    })

    mockAIParser.prototype.parseFile = mockParseFile
    mockAIParser.prototype.identifyColumns = mockIdentifyColumns
    mockAIParser.prototype.generateHierarchy = mockGenerateHierarchy
    mockAIParser.prototype.validateStructure = mockValidateStructure

    const caller = appRouter.createCaller({})
    
    // This should succeed because we have a name column (flat hierarchy is valid)
    const result = await caller.parseUploadedFile({
      fileUrl: 'https://example.com/no-manager.csv',
      fileName: 'no-manager.csv'
    })
    
    expect(result.success).toBe(true)
    expect(result.data.employees).toHaveLength(1)
    expect(result.data.rootEmployees).toHaveLength(1)
    expect(result.data.rootEmployees[0].name).toBe('John Doe')
  })

  it('should include comprehensive response structure', async () => {
    const mockFileBuffer = Buffer.from('Name,Title,Manager\nJohn Doe,Developer,Jane Smith\nJane Smith,Lead,Bob Johnson')
    const mockFetch = vi.mocked(fetch)
    const mockAIParser = vi.mocked(AIParserService)

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockFileBuffer.buffer)
    } as Response)

    const mockParseFile = vi.fn().mockResolvedValue({
      success: true,
      data: [
        ['Name', 'Title', 'Manager'],
        ['John Doe', 'Developer', 'Jane Smith'],
        ['Jane Smith', 'Lead', 'Bob Johnson']
      ]
    })

    const mockIdentifyColumns = vi.fn().mockReturnValue({
      nameColumn: 0,
      managerColumn: 2,
      titleColumn: 1,
      confidence: 0.9,
      analysis: 'High confidence identification'
    })

    const mockGenerateHierarchy = vi.fn().mockReturnValue({
      employees: [
        { name: 'John Doe', customFields: {} },
        { name: 'Jane Smith', customFields: {} }
      ],
      hierarchy: {},
      rootEmployees: ['Jane Smith'],
      orphanedEmployees: [],
      errors: ['Some processing error']
    })

    const mockValidateStructure = vi.fn().mockReturnValue({
      isValid: false,
      issues: ['Validation issue']
    })

    mockAIParser.prototype.parseFile = mockParseFile
    mockAIParser.prototype.identifyColumns = mockIdentifyColumns
    mockAIParser.prototype.generateHierarchy = mockGenerateHierarchy
    mockAIParser.prototype.validateStructure = mockValidateStructure

    const caller = appRouter.createCaller({})
    
    const result = await caller.parseUploadedFile({
      fileUrl: 'https://example.com/comprehensive.csv',
      fileName: 'comprehensive.csv'
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('employees')
    expect(result.data).toHaveProperty('hierarchy')
    expect(result.data).toHaveProperty('rootEmployees')
    expect(result.data).toHaveProperty('orphanedEmployees')
    expect(result.data).toHaveProperty('columnIdentification')
    expect(result.data).toHaveProperty('validation')
    expect(result.data).toHaveProperty('statistics')
    
    expect(result.data.columnIdentification).toEqual({
      nameColumn: 0,
      managerColumn: 2,
      confidence: 0.9,
      analysis: 'High confidence identification'
    })
    
    expect(result.data.validation).toEqual({
      isValid: false,
      issues: ['Validation issue']
    })
    
    expect(result.data.statistics).toEqual({
      totalEmployees: 2,
      rootEmployees: 1,
      orphanedEmployees: 0,
      totalErrors: 1
    })
  })

  it('should validate input parameters', async () => {
    const caller = appRouter.createCaller({})
    
    // Test invalid URL
    await expect(caller.parseUploadedFile({
      fileUrl: 'invalid-url',
      fileName: 'test.csv'
    })).rejects.toThrow()
    
    // Test empty fileName
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/test.csv',
      fileName: ''
    })).rejects.toThrow()
    
    // Test fileName too long
    await expect(caller.parseUploadedFile({
      fileUrl: 'https://example.com/test.csv',
      fileName: 'a'.repeat(256)
    })).rejects.toThrow()
  })
})
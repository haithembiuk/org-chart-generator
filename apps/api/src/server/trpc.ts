import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { AIParserService } from '../services/ai-parser'
import { databaseService } from '../services/database'
import { organizationRouter } from '../routers/organization'

const t = initTRPC.create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure

export const appRouter = router({
  organization: organizationRouter,
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name || 'World'}!`,
        message: 'Welcome to the Organization Chart Generator API!'
      }
    }),
  
  parseUploadedFile: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      fileName: z.string().min(1).max(255)
    }))
    .mutation(async ({ input }) => {
      const { fileUrl, fileName } = input
      const aiParser = new AIParserService()

      try {
        let fileBuffer: Buffer
        
        // Check if it's a data URL (for local development)
        if (fileUrl.startsWith('data:')) {
          const base64Data = fileUrl.split(',')[1]
          fileBuffer = Buffer.from(base64Data, 'base64')
        } else {
          // Fetch the file from Vercel Blob storage
          const response = await fetch(fileUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`)
          }
          fileBuffer = Buffer.from(await response.arrayBuffer())
        }

        // Parse the file content
        const parseResult = await aiParser.parseFile(fileBuffer, fileName)
        if (!parseResult.success) {
          throw new Error(parseResult.error || 'Failed to parse file')
        }

        if (!parseResult.data || parseResult.data.length === 0) {
          throw new Error('No data found in file')
        }

        // Identify columns using AI logic
        const columnResult = aiParser.identifyColumns(parseResult.data)
        if (columnResult.nameColumn === null && columnResult.managerColumn === null) {
          throw new Error('Could not identify employee name or manager columns')
        }

        if (columnResult.nameColumn === null) {
          throw new Error('Could not identify employee name column')
        }

        // Generate hierarchical structure
        const hierarchy = aiParser.generateHierarchy(
          parseResult.data,
          columnResult.nameColumn,
          columnResult.managerColumn || -1,
          columnResult.titleColumn
        )

        // Transform employees to include required Employee interface properties
        const employeesWithIds = hierarchy.employees.map((emp, index) => ({
          id: `emp-${Date.now()}-${index}`, // Generate unique ID
          name: emp.name,
          title: emp.title || 'Unknown Title',
          organizationId: 'default-org', // Use default organization ID
          managerId: null, // Will be set after we build the name-to-ID mapping
          customFields: emp.customFields || {}
        }))

        // Build ID mapping from old employee references to new IDs
        const nameToIdMap = new Map()
        employeesWithIds.forEach(emp => {
          nameToIdMap.set(emp.name, emp.id)
        })

        // Now update managerId fields with actual IDs
        employeesWithIds.forEach(emp => {
          const originalEmp = hierarchy.employees.find(e => e.name === emp.name)
          if (originalEmp && originalEmp.manager) {
            emp.managerId = nameToIdMap.get(originalEmp.manager) || null
          }
        })

        // Update hierarchy and related arrays to use the new employee IDs
        const updatedHierarchy: Record<string, any> = {}
        const updatedRootEmployees = []
        const updatedOrphanedEmployees = []

        // Update hierarchy structure with new IDs
        for (const [key, value] of Object.entries(hierarchy.hierarchy)) {
          const newKey = nameToIdMap.get(key) || key
          updatedHierarchy[newKey] = {
            ...value,
            managerId: value.managerId ? nameToIdMap.get(value.managerId) || value.managerId : null,
            directReports: value.directReports.map((reportName: string) => 
              nameToIdMap.get(reportName) || reportName
            )
          }
        }

        // Update root employees
        for (const rootEmpName of hierarchy.rootEmployees) {
          const empWithId = employeesWithIds.find(e => e.name === rootEmpName)
          if (empWithId) {
            updatedRootEmployees.push(empWithId)
          }
        }

        // Update orphaned employees
        for (const orphanEmpName of hierarchy.orphanedEmployees) {
          const empWithId = employeesWithIds.find(e => e.name === orphanEmpName)
          if (empWithId) {
            updatedOrphanedEmployees.push(empWithId)
          }
        }

        // Validate structure
        const validation = aiParser.validateStructure(hierarchy)

        // Persist employees to database in bulk for better performance
        await databaseService.bulkCreateEmployees(employeesWithIds)

        return {
          success: true,
          data: {
            employees: employeesWithIds,
            hierarchy: updatedHierarchy,
            rootEmployees: updatedRootEmployees,
            orphanedEmployees: updatedOrphanedEmployees,
            columnIdentification: {
              nameColumn: columnResult.nameColumn,
              managerColumn: columnResult.managerColumn,
              confidence: columnResult.confidence,
              analysis: columnResult.analysis
            },
            validation: {
              isValid: validation.isValid,
              issues: validation.issues
            },
            statistics: {
              totalEmployees: hierarchy.employees.length,
              rootEmployees: hierarchy.rootEmployees.length,
              orphanedEmployees: hierarchy.orphanedEmployees.length,
              totalErrors: hierarchy.errors.length
            }
          }
        }
      } catch (error) {
        console.error('Error parsing uploaded file:', error)
        throw new Error(`Failed to parse uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})

export type AppRouter = typeof appRouter
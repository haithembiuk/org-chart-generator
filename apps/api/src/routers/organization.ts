import { z } from 'zod'
import { initTRPC, TRPCError } from '@trpc/server'
import { Employee, Organization } from '../../../../packages/shared'
import { databaseService } from '../services/database'
import { HierarchyValidatorService } from '../services/hierarchy-validator'

const t = initTRPC.create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure

// Initialize hierarchy validator with database service
const hierarchyValidator = new HierarchyValidatorService(databaseService)

export const organizationRouter = router({
  createEmployee: publicProcedure
    .input(z.object({
      name: z.string().min(1, 'Employee name is required'),
      title: z.string().min(1, 'Employee title is required'),
      organizationId: z.string().min(1, 'Organization ID is required'),
      managerId: z.string().nullable().optional(),
      customFields: z.record(z.any()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // For demo purposes, use a default user ID since no auth is set up
        const userId = 'demo-user'

        // Generate a unique ID for the new employee
        const employeeId = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const newEmployee: Employee = {
          id: employeeId,
          name: input.name,
          title: input.title,
          organizationId: input.organizationId,
          managerId: input.managerId || null,
          customFields: input.customFields || {}
        }

        // Validate that the manager exists if provided
        if (input.managerId) {
          const manager = await databaseService.getEmployee(input.managerId)
          if (!manager) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Specified manager does not exist'
            })
          }
          
          // Ensure manager is in the same organization
          if (manager.organizationId !== input.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Manager must be in the same organization'
            })
          }
        }

        const createdEmployee = await databaseService.createEmployee(newEmployee)

        return {
          success: true,
          message: 'Employee created successfully',
          data: createdEmployee
        }
      } catch (error) {
        console.error('Error creating employee:', error)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create employee'
        })
      }
    }),

  updateManager: protectedProcedure
    .input(z.object({ 
      employeeId: z.string().min(1, 'Employee ID is required'),
      newManagerId: z.string().min(1, 'New manager ID is required')
    }))
    .mutation(async ({ ctx, input }) => {
      const { employeeId, newManagerId } = input
      
      try {
        // Extract user ID from context (assuming it's available from authentication)
        const userId = (ctx as any).session?.user?.id
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          })
        }

        // Validate the hierarchy update
        const validation = await hierarchyValidator.validateHierarchyUpdate(
          employeeId,
          newManagerId,
          userId
        )

        if (!validation.isValid) {
          throw new TRPCError({
            code: validation.errorCode === 'UNAUTHORIZED_ACCESS' ? 'FORBIDDEN' : 'BAD_REQUEST',
            message: validation.error || 'Validation failed'
          })
        }

        // Get the current employee
        const currentEmployee = await databaseService.getEmployee(employeeId)
        if (!currentEmployee) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Employee not found'
          })
        }

        // Update the employee's manager
        const updatedEmployee = {
          ...currentEmployee,
          managerId: newManagerId
        }

        await databaseService.updateEmployee(updatedEmployee)

        return {
          success: true,
          message: 'Manager updated successfully',
          data: {
            employeeId,
            newManagerId,
            previousManagerId: currentEmployee.managerId
          }
        }
      } catch (error) {
        console.error('Error updating manager:', error)
        
        // Re-throw TRPC errors
        if (error instanceof TRPCError) {
          throw error
        }
        
        // Handle database errors
        if (error instanceof Error && error.message.includes('database')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database operation failed'
          })
        }
        
        // Generic error handling
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update manager'
        })
      }
    }),
})

export type OrganizationRouter = typeof organizationRouter
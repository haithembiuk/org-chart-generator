import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { organizationRouter } from './organization'
import { databaseService } from '../services/database'
import { Employee, Organization } from '../../../../packages/shared'

// Mock the database service
vi.mock('../services/database', () => ({
  databaseService: {
    getEmployee: vi.fn(),
    getOrganization: vi.fn(),
    updateEmployee: vi.fn(),
    getEmployeesByOrganization: vi.fn(),
    getUserOrganizations: vi.fn(),
    addEmployeeToOrganization: vi.fn(),
  }
}))

describe('Organization Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockEmployee: Employee = {
    id: 'emp1',
    name: 'John Doe',
    title: 'Software Engineer',
    organizationId: 'org1',
    managerId: 'manager1'
  }

  const mockNewManager: Employee = {
    id: 'manager2',
    name: 'Jane Smith',
    title: 'Senior Manager',
    organizationId: 'org1',
    managerId: null
  }

  const mockOrganization: Organization = {
    id: 'org1',
    name: 'Test Organization',
    userId: 'user1',
    createdAt: new Date()
  }

  const mockContext = {
    session: {
      user: {
        id: 'user1'
      }
    }
  }

  describe('updateManager', () => {
    it('should successfully update employee manager', async () => {
      // Mock database responses in the correct order
      vi.mocked(databaseService.getEmployee)
        .mockResolvedValueOnce(mockEmployee)  // First call for validation
        .mockResolvedValueOnce(mockNewManager)  // Second call for validation
        .mockResolvedValueOnce(mockEmployee)  // Third call for getting current employee
      vi.mocked(databaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(databaseService.getEmployeesByOrganization).mockResolvedValue([mockEmployee, mockNewManager])
      vi.mocked(databaseService.updateEmployee).mockResolvedValue({
        ...mockEmployee,
        managerId: 'manager2'
      })

      const caller = organizationRouter.createCaller(mockContext)
      const result = await caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'manager2'
      })

      expect(result).toEqual({
        success: true,
        message: 'Manager updated successfully',
        data: {
          employeeId: 'emp1',
          newManagerId: 'manager2',
          previousManagerId: 'manager1'
        }
      })

      expect(databaseService.updateEmployee).toHaveBeenCalledWith({
        ...mockEmployee,
        managerId: 'manager2'
      })
    })

    it('should throw UNAUTHORIZED when user is not authenticated', async () => {
      const unauthenticatedContext = { session: null }
      const caller = organizationRouter.createCaller(unauthenticatedContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'manager2'
      })).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when employee does not exist', async () => {
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(null)

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'nonexistent',
        newManagerId: 'manager2'
      })).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when new manager does not exist', async () => {
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(null)

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'nonexistent'
      })).rejects.toThrow(TRPCError)
    })

    it('should throw BAD_REQUEST when employee and manager are in different organizations', async () => {
      const differentOrgManager = { ...mockNewManager, organizationId: 'org2' }
      
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(differentOrgManager)

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'manager2'
      })).rejects.toThrow(TRPCError)
    })

    it('should throw FORBIDDEN when user does not own the organization', async () => {
      const unauthorizedOrg = { ...mockOrganization, userId: 'otherUser' }
      
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(mockNewManager)
      vi.mocked(databaseService.getOrganization).mockResolvedValue(unauthorizedOrg)

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'manager2'
      })).rejects.toThrow(TRPCError)
    })

    it('should throw BAD_REQUEST when employee tries to become their own manager', async () => {
      vi.mocked(databaseService.getEmployee).mockResolvedValue(mockEmployee)
      vi.mocked(databaseService.getOrganization).mockResolvedValue(mockOrganization)

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'emp1'
      })).rejects.toThrow(TRPCError)
    })

    it('should throw BAD_REQUEST when update would create circular relationship', async () => {
      // Create a scenario where manager2 reports to emp1
      const circularManager = { ...mockNewManager, managerId: 'emp1' }
      
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(databaseService.getEmployee).mockResolvedValueOnce(circularManager)
      vi.mocked(databaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(databaseService.getEmployeesByOrganization).mockResolvedValue([mockEmployee, circularManager])

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'manager2'
      })).rejects.toThrow(TRPCError)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(databaseService.getEmployee).mockRejectedValue(new Error('Database connection failed'))

      const caller = organizationRouter.createCaller(mockContext)

      await expect(caller.updateManager({
        employeeId: 'emp1',
        newManagerId: 'manager2'
      })).rejects.toThrow(TRPCError)
    })
  })
})
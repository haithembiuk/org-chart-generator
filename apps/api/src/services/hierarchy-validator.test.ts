import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HierarchyValidatorService } from './hierarchy-validator'
import { DatabaseService } from './database'
import { Employee, Organization } from '../../../../packages/shared'

// Mock DatabaseService
const mockDatabaseService: DatabaseService = {
  getEmployee: vi.fn(),
  getOrganization: vi.fn(),
  updateEmployee: vi.fn(),
  getEmployeesByOrganization: vi.fn(),
  getUserOrganizations: vi.fn(),
}

describe('HierarchyValidatorService', () => {
  let service: HierarchyValidatorService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HierarchyValidatorService(mockDatabaseService)
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

  describe('validateHierarchyUpdate', () => {
    it('should return valid when all validations pass', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockNewManager)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(mockDatabaseService.getEmployeesByOrganization).mockResolvedValue([mockEmployee, mockNewManager])

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result).toEqual({ isValid: true })
    })

    it('should return invalid when employee does not exist', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(null)

      const result = await service.validateHierarchyUpdate('nonexistent', 'manager2', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND'
      })
    })

    it('should return invalid when new manager does not exist', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(null)

      const result = await service.validateHierarchyUpdate('emp1', 'nonexistent', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'New manager not found',
        errorCode: 'MANAGER_NOT_FOUND'
      })
    })

    it('should return invalid when employee and manager are in different organizations', async () => {
      const differentOrgManager = { ...mockNewManager, organizationId: 'org2' }
      
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(differentOrgManager)

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'Employee and manager must belong to the same organization',
        errorCode: 'DIFFERENT_ORGANIZATIONS'
      })
    })

    it('should return invalid when user does not own the organization', async () => {
      const unauthorizedOrg = { ...mockOrganization, userId: 'otherUser' }
      
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockNewManager)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(unauthorizedOrg)

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'Unauthorized access to organization',
        errorCode: 'UNAUTHORIZED_ACCESS'
      })
    })

    it('should return invalid when organization does not exist', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockNewManager)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(null)

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'Unauthorized access to organization',
        errorCode: 'UNAUTHORIZED_ACCESS'
      })
    })

    it('should return invalid when employee tries to become their own manager', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValue(mockEmployee)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)

      const result = await service.validateHierarchyUpdate('emp1', 'emp1', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'Employee cannot be their own manager',
        errorCode: 'SELF_MANAGEMENT'
      })
    })

    it('should return invalid when update would create circular relationship', async () => {
      // Create a scenario where manager2 reports to emp1
      const circularManager = { ...mockNewManager, managerId: 'emp1' }
      
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(circularManager)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(mockDatabaseService.getEmployeesByOrganization).mockResolvedValue([mockEmployee, circularManager])

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'This change would create a circular reporting relationship',
        errorCode: 'CIRCULAR_RELATIONSHIP'
      })
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockRejectedValue(new Error('Database error'))

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result).toEqual({
        isValid: false,
        error: 'Internal validation error',
        errorCode: 'INTERNAL_ERROR'
      })
    })
  })

  describe('checkCircularRelationship', () => {
    it('should detect direct circular relationship', async () => {
      const employee1 = { id: 'emp1', name: 'John', title: 'Engineer', organizationId: 'org1', managerId: 'emp2' }
      const employee2 = { id: 'emp2', name: 'Jane', title: 'Manager', organizationId: 'org1', managerId: 'emp1' }
      const employees = [employee1, employee2]

      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(employee2)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(employee1)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(mockDatabaseService.getEmployeesByOrganization).mockResolvedValue(employees)

      const result = await service.validateHierarchyUpdate('emp2', 'emp1', 'user1')

      expect(result.isValid).toBe(false)
      expect(result.errorCode).toBe('CIRCULAR_RELATIONSHIP')
    })

    it('should detect indirect circular relationship', async () => {
      const employees = [
        { id: 'emp1', managerId: 'emp2' },
        { id: 'emp2', managerId: 'emp3' },
        { id: 'emp3', managerId: null }
      ] as Employee[]

      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce({ ...mockNewManager, id: 'emp3' })
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(mockDatabaseService.getEmployeesByOrganization).mockResolvedValue(employees)

      const result = await service.validateHierarchyUpdate('emp3', 'emp1', 'user1')

      expect(result.isValid).toBe(false)
      expect(result.errorCode).toBe('CIRCULAR_RELATIONSHIP')
    })

    it('should allow valid hierarchy changes', async () => {
      const employees = [
        { id: 'emp1', managerId: 'manager1' },
        { id: 'emp2', managerId: 'manager1' },
        { id: 'manager1', managerId: null },
        { id: 'manager2', managerId: null }
      ] as Employee[]

      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockNewManager)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(mockDatabaseService.getEmployeesByOrganization).mockResolvedValue(employees)

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result.isValid).toBe(true)
    })

    it('should handle circular relationship detection errors safely', async () => {
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockEmployee)
      vi.mocked(mockDatabaseService.getEmployee).mockResolvedValueOnce(mockNewManager)
      vi.mocked(mockDatabaseService.getOrganization).mockResolvedValue(mockOrganization)
      vi.mocked(mockDatabaseService.getEmployeesByOrganization).mockRejectedValue(new Error('Database error'))

      const result = await service.validateHierarchyUpdate('emp1', 'manager2', 'user1')

      expect(result.isValid).toBe(false)
      expect(result.errorCode).toBe('CIRCULAR_RELATIONSHIP')
    })
  })
})
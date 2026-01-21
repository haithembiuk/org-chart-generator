import { describe, it, expect, vi, beforeEach } from 'vitest'
import { kv } from '@vercel/kv'
import { VercelKVService } from './database'
import { Employee, Organization } from '../../../../packages/shared'

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  }
}))

describe('VercelKVService', () => {
  let service: VercelKVService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VercelKVService()
  })

  const mockEmployee: Employee = {
    id: 'emp1',
    name: 'John Doe',
    title: 'Software Engineer',
    organizationId: 'org1',
    managerId: 'manager1'
  }

  const mockOrganization: Organization = {
    id: 'org1',
    name: 'Test Organization',
    userId: 'user1',
    createdAt: new Date()
  }

  describe('getEmployee', () => {
    it('should return employee when found', async () => {
      vi.mocked(kv.get).mockResolvedValue(mockEmployee)

      const result = await service.getEmployee('emp1')

      expect(result).toEqual(mockEmployee)
      expect(kv.get).toHaveBeenCalledWith('employee:emp1')
    })

    it('should return null when employee not found', async () => {
      vi.mocked(kv.get).mockResolvedValue(null)

      const result = await service.getEmployee('nonexistent')

      expect(result).toBeNull()
      expect(kv.get).toHaveBeenCalledWith('employee:nonexistent')
    })

    it('should throw error when database operation fails', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('Database error'))

      await expect(service.getEmployee('emp1')).rejects.toThrow('Failed to fetch employee from database')
    })
  })

  describe('getOrganization', () => {
    it('should return organization when found', async () => {
      vi.mocked(kv.get).mockResolvedValue(mockOrganization)

      const result = await service.getOrganization('org1')

      expect(result).toEqual(mockOrganization)
      expect(kv.get).toHaveBeenCalledWith('organization:org1')
    })

    it('should return null when organization not found', async () => {
      vi.mocked(kv.get).mockResolvedValue(null)

      const result = await service.getOrganization('nonexistent')

      expect(result).toBeNull()
      expect(kv.get).toHaveBeenCalledWith('organization:nonexistent')
    })

    it('should throw error when database operation fails', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('Database error'))

      await expect(service.getOrganization('org1')).rejects.toThrow('Failed to fetch organization from database')
    })
  })

  describe('updateEmployee', () => {
    it('should update employee successfully', async () => {
      vi.mocked(kv.set).mockResolvedValue('OK')

      const result = await service.updateEmployee(mockEmployee)

      expect(result).toEqual(mockEmployee)
      expect(kv.set).toHaveBeenCalledWith('employee:emp1', mockEmployee)
    })

    it('should throw error when database operation fails', async () => {
      vi.mocked(kv.set).mockRejectedValue(new Error('Database error'))

      await expect(service.updateEmployee(mockEmployee)).rejects.toThrow('Failed to update employee in database')
    })
  })

  describe('getEmployeesByOrganization', () => {
    it('should return employees for organization', async () => {
      const employeeIds = ['emp1', 'emp2']
      const employee2 = { ...mockEmployee, id: 'emp2', name: 'Jane Smith' }

      vi.mocked(kv.get)
        .mockResolvedValueOnce(employeeIds) // First call for employee IDs
        .mockResolvedValueOnce(mockEmployee) // Second call for emp1
        .mockResolvedValueOnce(employee2) // Third call for emp2

      const result = await service.getEmployeesByOrganization('org1')

      expect(result).toEqual([mockEmployee, employee2])
      expect(kv.get).toHaveBeenCalledWith('org_employees:org1')
      expect(kv.get).toHaveBeenCalledWith('employee:emp1')
      expect(kv.get).toHaveBeenCalledWith('employee:emp2')
    })

    it('should return empty array when no employees found', async () => {
      vi.mocked(kv.get).mockResolvedValue(null)

      const result = await service.getEmployeesByOrganization('org1')

      expect(result).toEqual([])
      expect(kv.get).toHaveBeenCalledWith('org_employees:org1')
    })

    it('should filter out non-existent employees', async () => {
      const employeeIds = ['emp1', 'emp2']

      vi.mocked(kv.get)
        .mockResolvedValueOnce(employeeIds) // First call for employee IDs
        .mockResolvedValueOnce(mockEmployee) // Second call for emp1
        .mockResolvedValueOnce(null) // Third call for emp2 (not found)

      const result = await service.getEmployeesByOrganization('org1')

      expect(result).toEqual([mockEmployee])
    })

    it('should throw error when database operation fails', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('Database error'))

      await expect(service.getEmployeesByOrganization('org1')).rejects.toThrow('Failed to fetch organization employees from database')
    })
  })

  describe('getUserOrganizations', () => {
    it('should return organizations for user', async () => {
      const organizationIds = ['org1', 'org2']
      const organization2 = { ...mockOrganization, id: 'org2', name: 'Test Organization 2' }

      vi.mocked(kv.get)
        .mockResolvedValueOnce(organizationIds) // First call for organization IDs
        .mockResolvedValueOnce(mockOrganization) // Second call for org1
        .mockResolvedValueOnce(organization2) // Third call for org2

      const result = await service.getUserOrganizations('user1')

      expect(result).toEqual([mockOrganization, organization2])
      expect(kv.get).toHaveBeenCalledWith('user_orgs:user1')
      expect(kv.get).toHaveBeenCalledWith('organization:org1')
      expect(kv.get).toHaveBeenCalledWith('organization:org2')
    })

    it('should return empty array when no organizations found', async () => {
      vi.mocked(kv.get).mockResolvedValue(null)

      const result = await service.getUserOrganizations('user1')

      expect(result).toEqual([])
      expect(kv.get).toHaveBeenCalledWith('user_orgs:user1')
    })

    it('should throw error when database operation fails', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('Database error'))

      await expect(service.getUserOrganizations('user1')).rejects.toThrow('Failed to fetch user organizations from database')
    })
  })

  describe('addEmployeeToOrganization', () => {
    it('should add employee to organization', async () => {
      const existingEmployees = ['emp1']
      
      vi.mocked(kv.get).mockResolvedValue(existingEmployees)
      vi.mocked(kv.set).mockResolvedValue('OK')

      await service.addEmployeeToOrganization('org1', 'emp2')

      expect(kv.set).toHaveBeenCalledWith('org_employees:org1', ['emp1', 'emp2'])
    })

    it('should not add duplicate employee', async () => {
      const existingEmployees = ['emp1', 'emp2']
      
      vi.mocked(kv.get).mockResolvedValue(existingEmployees)
      vi.mocked(kv.set).mockResolvedValue('OK')

      await service.addEmployeeToOrganization('org1', 'emp2')

      expect(kv.set).not.toHaveBeenCalled()
    })

    it('should handle empty employee list', async () => {
      vi.mocked(kv.get).mockResolvedValue(null)
      vi.mocked(kv.set).mockResolvedValue('OK')

      await service.addEmployeeToOrganization('org1', 'emp1')

      expect(kv.set).toHaveBeenCalledWith('org_employees:org1', ['emp1'])
    })

    it('should throw error when database operation fails', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('Database error'))

      await expect(service.addEmployeeToOrganization('org1', 'emp1')).rejects.toThrow('Failed to add employee to organization')
    })
  })
})
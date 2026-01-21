import { Employee } from '../../../../packages/shared'
import { DatabaseService } from './database'

export interface HierarchyValidationResult {
  isValid: boolean
  error?: string
  errorCode?: string
}

export class HierarchyValidatorService {
  constructor(private databaseService: DatabaseService) {}

  async validateHierarchyUpdate(
    employeeId: string,
    newManagerId: string,
    userId: string
  ): Promise<HierarchyValidationResult> {
    try {
      // 1. Validate that employee exists
      const employee = await this.databaseService.getEmployee(employeeId)
      if (!employee) {
        return {
          isValid: false,
          error: 'Employee not found',
          errorCode: 'EMPLOYEE_NOT_FOUND'
        }
      }

      // 2. Validate that new manager exists
      const newManager = await this.databaseService.getEmployee(newManagerId)
      if (!newManager) {
        return {
          isValid: false,
          error: 'New manager not found',
          errorCode: 'MANAGER_NOT_FOUND'
        }
      }

      // 3. Validate that both employee and manager belong to the same organization
      if (employee.organizationId !== newManager.organizationId) {
        return {
          isValid: false,
          error: 'Employee and manager must belong to the same organization',
          errorCode: 'DIFFERENT_ORGANIZATIONS'
        }
      }

      // 4. Validate that the organization belongs to the authenticated user
      const organization = await this.databaseService.getOrganization(employee.organizationId)
      if (!organization || organization.userId !== userId) {
        return {
          isValid: false,
          error: 'Unauthorized access to organization',
          errorCode: 'UNAUTHORIZED_ACCESS'
        }
      }

      // 5. Validate that employee is not trying to become their own manager
      if (employeeId === newManagerId) {
        return {
          isValid: false,
          error: 'Employee cannot be their own manager',
          errorCode: 'SELF_MANAGEMENT'
        }
      }

      // 6. Validate that this update doesn't create a circular reporting relationship
      const wouldCreateCircularRelationship = await this.checkCircularRelationship(
        employeeId,
        newManagerId,
        employee.organizationId
      )
      
      if (wouldCreateCircularRelationship) {
        return {
          isValid: false,
          error: 'This change would create a circular reporting relationship',
          errorCode: 'CIRCULAR_RELATIONSHIP'
        }
      }

      return { isValid: true }
    } catch (error) {
      console.error('Error validating hierarchy update:', error)
      return {
        isValid: false,
        error: 'Internal validation error',
        errorCode: 'INTERNAL_ERROR'
      }
    }
  }

  private async checkCircularRelationship(
    employeeId: string,
    newManagerId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      // Get all employees in the organization
      const allEmployees = await this.databaseService.getEmployeesByOrganization(organizationId)
      
      // Build a map of employee relationships
      const employeeMap = new Map<string, Employee>()
      allEmployees.forEach(emp => employeeMap.set(emp.id, emp))
      
      // Check if newManagerId is a subordinate of employeeId
      return this.isSubordinate(employeeId, newManagerId, employeeMap)
    } catch (error) {
      console.error('Error checking circular relationship:', error)
      return true // Return true (circular detected) as a safety measure
    }
  }

  private isSubordinate(
    managerId: string,
    potentialSubordinateId: string,
    employeeMap: Map<string, Employee>,
    visited: Set<string> = new Set()
  ): boolean {
    // Avoid infinite loops
    if (visited.has(potentialSubordinateId)) {
      return false
    }
    visited.add(potentialSubordinateId)

    const employee = employeeMap.get(potentialSubordinateId)
    if (!employee || !employee.managerId) {
      return false
    }

    // Direct subordinate
    if (employee.managerId === managerId) {
      return true
    }

    // Check up the chain
    return this.isSubordinate(managerId, employee.managerId, employeeMap, visited)
  }
}

export const hierarchyValidatorService = new HierarchyValidatorService(
  // Will be injected when used
  {} as DatabaseService
)
import { Employee, Organization, User } from '../../../../packages/shared'

// In-memory storage for local development
const memoryStore = new Map<string, any>()

export interface DatabaseService {
  getEmployee(id: string): Promise<Employee | null>
  getOrganization(id: string): Promise<Organization | null>
  updateEmployee(employee: Employee): Promise<Employee>
  createEmployee(employee: Employee): Promise<Employee>
  bulkCreateEmployees(employees: Employee[]): Promise<Employee[]>
  getEmployeesByOrganization(organizationId: string): Promise<Employee[]>
  getUserOrganizations(userId: string): Promise<Organization[]>
}

export class VercelKVService implements DatabaseService {
  private readonly EMPLOYEE_KEY_PREFIX = 'employee:'
  private readonly ORGANIZATION_KEY_PREFIX = 'organization:'
  private readonly USER_ORGANIZATIONS_KEY_PREFIX = 'user_orgs:'
  private readonly ORGANIZATION_EMPLOYEES_KEY_PREFIX = 'org_employees:'

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      // Use in-memory storage for local development
      const employee = memoryStore.get(`${this.EMPLOYEE_KEY_PREFIX}${id}`) || null
      return employee
    } catch (error) {
      console.error('Error fetching employee:', error)
      throw new Error('Failed to fetch employee from database')
    }
  }

  async getOrganization(id: string): Promise<Organization | null> {
    try {
      const organization = memoryStore.get(`${this.ORGANIZATION_KEY_PREFIX}${id}`) || null
      return organization
    } catch (error) {
      console.error('Error fetching organization:', error)
      throw new Error('Failed to fetch organization from database')
    }
  }

  async updateEmployee(employee: Employee): Promise<Employee> {
    try {
      memoryStore.set(`${this.EMPLOYEE_KEY_PREFIX}${employee.id}`, employee)
      return employee
    } catch (error) {
      console.error('Error updating employee:', error)
      throw new Error('Failed to update employee in database')
    }
  }

  async createEmployee(employee: Employee): Promise<Employee> {
    try {
      memoryStore.set(`${this.EMPLOYEE_KEY_PREFIX}${employee.id}`, employee)
      await this.addEmployeeToOrganization(employee.organizationId, employee.id)
      return employee
    } catch (error) {
      console.error('Error creating employee:', error)
      throw new Error('Failed to create employee in database')
    }
  }

  async bulkCreateEmployees(employees: Employee[]): Promise<Employee[]> {
    try {
      // Group employees by organization for efficient batch updates
      const employeesByOrg = new Map<string, string[]>()

      // Store all employees in a single pass
      for (const employee of employees) {
        memoryStore.set(`${this.EMPLOYEE_KEY_PREFIX}${employee.id}`, employee)

        // Collect employee IDs by organization
        const orgEmployees = employeesByOrg.get(employee.organizationId) || []
        orgEmployees.push(employee.id)
        employeesByOrg.set(employee.organizationId, orgEmployees)
      }

      // Batch update organization employee lists
      employeesByOrg.forEach((employeeIds, organizationId) => {
        const existingIds = memoryStore.get(`${this.ORGANIZATION_EMPLOYEES_KEY_PREFIX}${organizationId}`) || []
        const newIds = [...existingIds, ...employeeIds.filter(id => !existingIds.includes(id))]
        memoryStore.set(`${this.ORGANIZATION_EMPLOYEES_KEY_PREFIX}${organizationId}`, newIds)
      })

      return employees
    } catch (error) {
      console.error('Error bulk creating employees:', error)
      throw new Error('Failed to bulk create employees in database')
    }
  }

  async getEmployeesByOrganization(organizationId: string): Promise<Employee[]> {
    try {
      const employeeIds = memoryStore.get(`${this.ORGANIZATION_EMPLOYEES_KEY_PREFIX}${organizationId}`) || []
      const employees: Employee[] = []
      
      for (const employeeId of employeeIds) {
        const employee = await this.getEmployee(employeeId)
        if (employee) {
          employees.push(employee)
        }
      }
      
      return employees
    } catch (error) {
      console.error('Error fetching organization employees:', error)
      throw new Error('Failed to fetch organization employees from database')
    }
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const organizationIds = memoryStore.get(`${this.USER_ORGANIZATIONS_KEY_PREFIX}${userId}`) || []
      const organizations: Organization[] = []
      
      for (const organizationId of organizationIds) {
        const organization = await this.getOrganization(organizationId)
        if (organization) {
          organizations.push(organization)
        }
      }
      
      return organizations
    } catch (error) {
      console.error('Error fetching user organizations:', error)
      throw new Error('Failed to fetch user organizations from database')
    }
  }

  async addEmployeeToOrganization(organizationId: string, employeeId: string): Promise<void> {
    try {
      const employeeIds = memoryStore.get(`${this.ORGANIZATION_EMPLOYEES_KEY_PREFIX}${organizationId}`) || []
      if (!employeeIds.includes(employeeId)) {
        employeeIds.push(employeeId)
        memoryStore.set(`${this.ORGANIZATION_EMPLOYEES_KEY_PREFIX}${organizationId}`, employeeIds)
      }
    } catch (error) {
      console.error('Error adding employee to organization:', error)
      throw new Error('Failed to add employee to organization')
    }
  }
}

export const databaseService = new VercelKVService()
export interface User {
  id: string
  email: string
  name: string
  image?: string
}

export interface Organization {
  id: string
  name: string
  userId: string
  createdAt: Date
}

export interface Employee {
  id: string
  name: string
  title: string
  organizationId: string
  managerId?: string | null
  customFields?: Record<string, any>
}

export { useChartStore } from './chart-store'
export type { ChartData } from './chart-store'
import { Readable } from 'stream';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Constants for better maintainability
const SUPPORTED_EXTENSIONS = ['csv', 'xlsx', 'xls'] as const;
const CONFIDENCE_THRESHOLDS = {
  PATTERN_MATCH: 0.4,
  FALLBACK_BOOST: 0.2,
  BOTH_COLUMNS_BONUS: 0.2,
  HIGH_CONFIDENCE: 0.6,
  MANAGER_CONFIDENCE: 0.5
} as const;

export interface FileProcessingResult {
  success: boolean;
  data?: any[][];
  error?: string;
}

export interface ColumnIdentificationResult {
  nameColumn: number | null;
  managerColumn: number | null;
  titleColumn: number | null;
  confidence: number;
  analysis: string;
}

export interface ParsedEmployee {
  name: string;
  title?: string;
  manager?: string;
  customFields: Record<string, any>;
}

export interface HierarchicalStructure {
  employees: ParsedEmployee[];
  hierarchy: {
    [employeeName: string]: {
      employee: ParsedEmployee;
      directReports: string[];
      managerId: string | null;
    };
  };
  rootEmployees: string[];
  orphanedEmployees: string[];
  errors: string[];
}

// Pattern matching constants
const NAME_PATTERNS = [
  /^name$/i,
  /^employee.*name$/i,
  /^full.*name$/i,
  /^first.*name$/i,
  /^employee$/i,
  /^person$/i,
  /^staff$/i
] as const;

const MANAGER_PATTERNS = [
  /^manager$/i,
  /^manager.*name$/i,
  /^supervisor$/i,
  /^boss$/i,
  /^reports.*to$/i,
  /^direct.*manager$/i,
  /^line.*manager$/i
] as const;

const TITLE_PATTERNS = [
  /^title$/i,
  /^job.*title$/i,
  /^position$/i,
  /^role$/i,
  /^designation$/i,
  /^rank$/i,
  /^level$/i
] as const;

export class AIParserService {
  /**
   * Reads and parses CSV/XLSX files into a 2D array
   */
  async parseFile(fileBuffer: Buffer, fileName: string): Promise<FileProcessingResult> {
    try {
      const parts = fileName.split('.');
      
      if (parts.length === 1) {
        // No extension found
        return {
          success: false,
          error: 'Unable to determine file type'
        };
      }
      
      const fileExtension = parts.pop()?.toLowerCase();
      
      if (!fileExtension) {
        return {
          success: false,
          error: 'Unable to determine file type'
        };
      }

      if (!SUPPORTED_EXTENSIONS.includes(fileExtension as any)) {
        return {
          success: false,
          error: `Unsupported file format. Please use one of: ${SUPPORTED_EXTENSIONS.join(', ')}`
        };
      }

      if (fileExtension === 'csv') {
        return this.parseCSV(fileBuffer);
      } else {
        return this.parseExcel(fileBuffer);
      }
    } catch (error) {
      return {
        success: false,
        error: `File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Parses CSV files using Papa Parse
   */
  private parseCSV(fileBuffer: Buffer): Promise<FileProcessingResult> {
    return new Promise((resolve) => {
      try {
        const csvContent = fileBuffer.toString('utf-8');
        
        Papa.parse(csvContent, {
          complete: (results) => {
            if (results.errors.length > 0) {
              resolve({
                success: false,
                error: `CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`
              });
              return;
            }
            
            resolve({
              success: true,
              data: results.data as any[][]
            });
          },
          error: (error: any) => {
            resolve({
              success: false,
              error: `CSV parsing failed: ${error.message}`
            });
          }
        });
      } catch (error) {
        resolve({
          success: false,
          error: `CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });
  }

  /**
   * Parses Excel files using XLSX library
   */
  private parseExcel(fileBuffer: Buffer): FileProcessingResult {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      
      if (!firstSheetName) {
        return {
          success: false,
          error: 'No sheets found in Excel file'
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      return {
        success: true,
        data: jsonData as any[][]
      };
    } catch (error) {
      return {
        success: false,
        error: `Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Identifies employee name and manager columns using AI logic and fallback patterns
   */
  identifyColumns(data: any[][]): ColumnIdentificationResult {
    if (!data || data.length === 0) {
      return {
        nameColumn: null,
        managerColumn: null,
        titleColumn: null,
        confidence: 0,
        analysis: 'No data provided'
      };
    }

    const headers = data[0];
    if (!headers || headers.length === 0) {
      return {
        nameColumn: null,
        managerColumn: null,
        titleColumn: null,
        confidence: 0,
        analysis: 'No headers found'
      };
    }

    // Use extracted pattern constants

    let nameColumn: number | null = null;
    let managerColumn: number | null = null;
    let titleColumn: number | null = null;
    let confidence = 0;
    let analysis = '';

    // Try to find name column
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      
      for (const pattern of NAME_PATTERNS) {
        if (pattern.test(header)) {
          nameColumn = i;
          confidence += CONFIDENCE_THRESHOLDS.PATTERN_MATCH;
          analysis += `Found name column "${header}" at index ${i}. `;
          break;
        }
      }
      
      if (nameColumn !== null) break;
    }

    // Try to find manager column
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      
      for (const pattern of MANAGER_PATTERNS) {
        if (pattern.test(header)) {
          managerColumn = i;
          confidence += CONFIDENCE_THRESHOLDS.PATTERN_MATCH;
          analysis += `Found manager column "${header}" at index ${i}. `;
          break;
        }
      }
      
      if (managerColumn !== null) break;
    }

    // Try to find title column
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      
      for (const pattern of TITLE_PATTERNS) {
        if (pattern.test(header)) {
          titleColumn = i;
          confidence += CONFIDENCE_THRESHOLDS.PATTERN_MATCH;
          analysis += `Found title column "${header}" at index ${i}. `;
          break;
        }
      }
      
      if (titleColumn !== null) break;
    }

    // Fallback: use heuristics based on content
    if (nameColumn === null || managerColumn === null || titleColumn === null) {
      const fallbackResult = this.applyFallbackLogic(data);
      if (nameColumn === null) {
        nameColumn = fallbackResult.nameColumn;
        if (nameColumn !== null) {
          confidence += CONFIDENCE_THRESHOLDS.FALLBACK_BOOST;
          analysis += `Fallback identified name column at index ${nameColumn}. `;
        }
      }
      if (managerColumn === null) {
        managerColumn = fallbackResult.managerColumn;
        if (managerColumn !== null) {
          confidence += CONFIDENCE_THRESHOLDS.FALLBACK_BOOST;
          analysis += `Fallback identified manager column at index ${managerColumn}. `;
        }
      }
      if (titleColumn === null) {
        titleColumn = fallbackResult.titleColumn;
        if (titleColumn !== null) {
          confidence += CONFIDENCE_THRESHOLDS.FALLBACK_BOOST;
          analysis += `Fallback identified title column at index ${titleColumn}. `;
        }
      }
    }

    // Additional confidence boost if both columns found
    if (nameColumn !== null && managerColumn !== null) {
      confidence += CONFIDENCE_THRESHOLDS.BOTH_COLUMNS_BONUS;
    }

    return {
      nameColumn,
      managerColumn,
      titleColumn,
      confidence: Math.min(confidence, 1.0),
      analysis
    };
  }

  /**
   * Fallback logic for column identification based on content analysis
   */
  private applyFallbackLogic(data: any[][]): { nameColumn: number | null; managerColumn: number | null; titleColumn: number | null } {
    if (data.length < 2) {
      return { nameColumn: null, managerColumn: null, titleColumn: null };
    }

    const headers = data[0];
    const sampleRows = data.slice(1, Math.min(6, data.length)); // Analyze first 5 rows

    let nameColumn: number | null = null;
    let managerColumn: number | null = null;
    let titleColumn: number | null = null;

    // Look for columns that might contain person names
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const values = sampleRows.map(row => String(row[colIndex] || '').trim());
      
      // Check if this column contains name-like values
      const nameScore = this.calculateNameScore(values);
      if (nameScore > CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE && nameColumn === null) {
        nameColumn = colIndex;
      }
      
      // Check if this column contains manager-like values (similar to names but might have duplicates)
      const managerScore = this.calculateManagerScore(values);
      if (managerScore > CONFIDENCE_THRESHOLDS.MANAGER_CONFIDENCE && managerColumn === null && colIndex !== nameColumn) {
        managerColumn = colIndex;
      }
    }

    return { nameColumn, managerColumn, titleColumn };
  }

  /**
   * Calculates a score for how likely a column contains employee names
   */
  private calculateNameScore(values: string[]): number {
    let score = 0;
    const validValues = values.filter(v => v.length > 0);
    
    if (validValues.length === 0) return 0;

    for (const value of validValues) {
      // Check if value looks like a name (contains letters, possibly spaces)
      if (/^[a-zA-Z\s'-]+$/.test(value) && value.length > 1) {
        score += 0.3;
      }
      
      // Bonus for having multiple words (first + last name)
      if (value.split(' ').length >= 2) {
        score += 0.2;
      }
      
      // Penalty for numbers or special characters
      if (/[0-9@#$%^&*()_+=\[\]{}|;:,.<>?/~`]/.test(value)) {
        score -= 0.1;
      }
    }

    return Math.max(0, Math.min(1, score / validValues.length));
  }

  /**
   * Calculates a score for how likely a column contains manager names
   */
  private calculateManagerScore(values: string[]): number {
    const nameScore = this.calculateNameScore(values);
    
    // Managers might have duplicate names (one manager for multiple employees)
    const uniqueValues = new Set(values.filter(v => v.length > 0));
    const duplicateRatio = uniqueValues.size / values.filter(v => v.length > 0).length;
    
    // Lower uniqueness ratio suggests manager column
    const managerBonus = duplicateRatio < 0.8 ? 0.2 : 0;
    
    return Math.min(1, nameScore + managerBonus);
  }

  /**
   * Generates hierarchical organizational structure from parsed data
   */
  generateHierarchy(data: any[][], nameColumn: number, managerColumn: number, titleColumn: number | null = null): HierarchicalStructure {
    const employees: ParsedEmployee[] = [];
    const hierarchy: HierarchicalStructure['hierarchy'] = {};
    const managerToEmployees: Record<string, string[]> = {};
    const allEmployeeNames = new Set<string>();
    const allManagerNames = new Set<string>();
    const errors: string[] = [];

    // Skip header row
    const dataRows = data.slice(1);

    // First pass: create employee objects
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const employeeName = String(row[nameColumn] || '').trim();
      const managerName = String(row[managerColumn] || '').trim();
      const title = titleColumn !== null ? String(row[titleColumn] || '').trim() : undefined;

      if (!employeeName) {
        errors.push(`Row ${i + 2}: Empty employee name`);
        continue;
      }

      if (allEmployeeNames.has(employeeName)) {
        errors.push(`Row ${i + 2}: Duplicate employee name "${employeeName}"`);
        continue;
      }

      // Extract custom fields from other columns
      const customFields: Record<string, any> = {};
      for (let j = 0; j < row.length; j++) {
        if (j !== nameColumn && j !== managerColumn && j !== titleColumn && data[0][j]) {
          const fieldName = String(data[0][j]).trim();
          const fieldValue = row[j] ? String(row[j]).trim() : '';
          if (fieldName && fieldValue) {
            customFields[fieldName] = fieldValue;
          }
        }
      }

      const employee: ParsedEmployee = {
        name: employeeName,
        title: title || undefined,
        manager: managerName || undefined,
        customFields
      };

      employees.push(employee);
      allEmployeeNames.add(employeeName);
      
      if (managerName) {
        allManagerNames.add(managerName);
        if (!managerToEmployees[managerName]) {
          managerToEmployees[managerName] = [];
        }
        managerToEmployees[managerName].push(employeeName);
      }
    }

    // Second pass: build hierarchy
    for (const employee of employees) {
      const directReports = managerToEmployees[employee.name] || [];
      const managerId = employee.manager || null;

      hierarchy[employee.name] = {
        employee,
        directReports,
        managerId
      };
    }

    // Identify root employees (those without managers or with managers not in employee list)
    const rootEmployees: string[] = [];
    const orphanedEmployees: string[] = [];

    for (const employee of employees) {
      if (!employee.manager) {
        rootEmployees.push(employee.name);
      } else if (!allEmployeeNames.has(employee.manager)) {
        // Manager not in employee list - treat as root or orphaned
        rootEmployees.push(employee.name);
        errors.push(`Employee "${employee.name}" has manager "${employee.manager}" who is not in the employee list`);
      }
    }

    // Check for circular reporting
    this.detectCircularReporting(hierarchy, errors);

    return {
      employees,
      hierarchy,
      rootEmployees,
      orphanedEmployees,
      errors
    };
  }

  /**
   * Detects circular reporting structures in the hierarchy
   */
  private detectCircularReporting(hierarchy: HierarchicalStructure['hierarchy'], errors: string[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (employeeName: string, path: string[]): void => {
      if (recursionStack.has(employeeName)) {
        errors.push(`Circular reporting detected: ${path.join(' -> ')} -> ${employeeName}`);
        return;
      }

      if (visited.has(employeeName)) {
        return;
      }

      visited.add(employeeName);
      recursionStack.add(employeeName);

      const employee = hierarchy[employeeName];
      if (employee?.managerId && hierarchy[employee.managerId]) {
        dfs(employee.managerId, [...path, employeeName]);
      }

      recursionStack.delete(employeeName);
    };

    for (const employeeName of Object.keys(hierarchy)) {
      if (!visited.has(employeeName)) {
        dfs(employeeName, []);
      }
    }
  }

  /**
   * Validates the integrity of the organizational structure
   */
  validateStructure(structure: HierarchicalStructure): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for employees without names
    const employeesWithoutNames = structure.employees.filter(emp => !emp.name || emp.name.trim() === '');
    if (employeesWithoutNames.length > 0) {
      issues.push(`${employeesWithoutNames.length} employees have empty names`);
    }

    // Check for hierarchy consistency
    for (const [employeeName, hierarchyNode] of Object.entries(structure.hierarchy)) {
      // Verify direct reports exist
      for (const directReport of hierarchyNode.directReports) {
        if (!structure.hierarchy[directReport]) {
          issues.push(`Employee "${employeeName}" has direct report "${directReport}" who doesn't exist in hierarchy`);
        }
      }

      // Verify manager relationship is bidirectional
      if (hierarchyNode.managerId) {
        const manager = structure.hierarchy[hierarchyNode.managerId];
        if (!manager) {
          issues.push(`Employee "${employeeName}" has manager "${hierarchyNode.managerId}" who doesn't exist in hierarchy`);
        } else if (!manager.directReports.includes(employeeName)) {
          issues.push(`Manager "${hierarchyNode.managerId}" doesn't list "${employeeName}" as a direct report`);
        }
      }
    }

    // Add existing errors from structure
    issues.push(...structure.errors);

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
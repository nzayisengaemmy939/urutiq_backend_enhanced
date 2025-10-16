import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE' | 'CUSTOM'
  isPublic: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  config: ReportConfig
}

export interface ReportConfig {
  dataSource: string
  filters: ReportFilter[]
  columns: ReportColumn[]
  grouping: ReportGrouping[]
  sorting: ReportSorting[]
  formatting: ReportFormatting
  charts: ReportChart[]
  layout: ReportLayout
}

export interface ReportFilter {
  id: string
  field: string
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN' | 'IN' | 'NOT_IN' | 'IS_NULL' | 'IS_NOT_NULL'
  value: any
  label: string
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'
  options?: Array<{ value: any; label: string }>
}

export interface ReportColumn {
  id: string
  field: string
  label: string
  dataType: 'TEXT' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'BOOLEAN' | 'PERCENTAGE'
  width?: number
  alignment: 'LEFT' | 'CENTER' | 'RIGHT'
  format?: string
  aggregation?: 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX' | 'FIRST' | 'LAST'
  isVisible: boolean
  order: number
}

export interface ReportGrouping {
  id: string
  field: string
  label: string
  order: number
  aggregation?: 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX'
}

export interface ReportSorting {
  id: string
  field: string
  direction: 'ASC' | 'DESC'
  order: number
}

export interface ReportFormatting {
  title: string
  subtitle?: string
  showHeader: boolean
  showFooter: boolean
  pageSize: 'A4' | 'LETTER' | 'LEGAL'
  orientation: 'PORTRAIT' | 'LANDSCAPE'
  margins: { top: number; right: number; bottom: number; left: number }
  fontFamily: string
  fontSize: number
  colors: { primary: string; secondary: string; accent: string; background: string; text: string }
}

export interface ReportChart {
  id: string
  type: 'BAR' | 'LINE' | 'PIE' | 'AREA' | 'SCATTER' | 'TABLE'
  title: string
  dataSource: string
  xAxis: string
  yAxis: string
  series: string[]
  position: { x: number; y: number; width: number; height: number }
  config: any
}

export interface ReportLayout {
  type: 'SINGLE_COLUMN' | 'TWO_COLUMN' | 'THREE_COLUMN' | 'CUSTOM'
  sections: ReportSection[]
}

export interface ReportSection {
  id: string
  type: 'CHART' | 'TABLE' | 'TEXT' | 'IMAGE'
  content: any
  position: { x: number; y: number; width: number; height: number }
  order: number
}

export interface CustomReport {
  id: string
  companyId: string
  name: string
  description?: string
  templateId?: string
  config: ReportConfig
  isPublic: boolean
  isScheduled: boolean
  scheduleConfig?: ScheduleConfig
  createdBy: string
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}

export interface ScheduleConfig {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  recipients: string[]
  format: 'PDF' | 'EXCEL' | 'CSV' | 'HTML'
}

export interface ReportData {
  columns: string[]
  rows: any[]
  summary: { totalRows: number; totalColumns: number; generatedAt: string; executionTime: number }
}

export class CustomReportBuilderService {
  async createTemplate(templateData: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    return {
      id: `template-${Date.now()}`,
      ...templateData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async getTemplates(companyId: string): Promise<ReportTemplate[]> {
    return [
      {
        id: 'template-1',
        name: 'Income Statement',
        description: 'Standard income statement with revenue and expenses',
        category: 'FINANCIAL',
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          dataSource: 'financial_data',
          filters: [],
          columns: [
            { id: 'col-1', field: 'account_name', label: 'Account', dataType: 'TEXT', alignment: 'LEFT', isVisible: true, order: 1 },
            { id: 'col-2', field: 'amount', label: 'Amount', dataType: 'CURRENCY', alignment: 'RIGHT', aggregation: 'SUM', isVisible: true, order: 2 }
          ],
          grouping: [],
          sorting: [{ id: 'sort-1', field: 'account_name', direction: 'ASC', order: 1 }],
          formatting: {
            title: 'Income Statement',
            showHeader: true,
            showFooter: true,
            pageSize: 'A4',
            orientation: 'PORTRAIT',
            margins: { top: 1, right: 1, bottom: 1, left: 1 },
            fontFamily: 'Arial',
            fontSize: 12,
            colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', text: '#000000' }
          },
          charts: [],
          layout: { type: 'SINGLE_COLUMN', sections: [] }
        }
      }
    ]
  }

  async getDataSources(companyId: string) {
    return [
      {
        id: 'ds-1',
        name: 'Financial Data',
        type: 'TABLE',
        description: 'Chart of accounts and journal entries',
        isActive: true,
        fields: [
          { name: 'account_name', label: 'Account Name', dataType: 'TEXT', isRequired: true, isFilterable: true, isGroupable: true, isSortable: true },
          { name: 'amount', label: 'Amount', dataType: 'CURRENCY', isRequired: true, isFilterable: true, isGroupable: false, isSortable: true },
          { name: 'date', label: 'Date', dataType: 'DATE', isRequired: true, isFilterable: true, isGroupable: true, isSortable: true }
        ]
      }
    ]
  }

  async createReport(companyId: string, reportData: Omit<CustomReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomReport> {
    return {
      id: `report-${Date.now()}`,
      ...reportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async getReports(companyId: string): Promise<CustomReport[]> {
    return [
      {
        id: 'report-1',
        companyId,
        name: 'Monthly Financial Summary',
        description: 'Custom monthly financial summary report',
        config: {
          dataSource: 'financial_data',
          filters: [],
          columns: [],
          grouping: [],
          sorting: [],
          formatting: {
            title: 'Monthly Financial Summary',
            showHeader: true,
            showFooter: true,
            pageSize: 'A4',
            orientation: 'PORTRAIT',
            margins: { top: 1, right: 1, bottom: 1, left: 1 },
            fontFamily: 'Arial',
            fontSize: 12,
            colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', text: '#000000' }
          },
          charts: [],
          layout: { type: 'SINGLE_COLUMN', sections: [] }
        },
        isPublic: false,
        isScheduled: true,
        createdBy: 'user-1',
        lastRunAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  async generateReport(reportId: string, parameters: Record<string, any> = {}): Promise<ReportData> {
    return {
      columns: ['account_name', 'amount', 'date'],
      rows: [
        { account_name: 'Sales Revenue', amount: 100000, date: '2024-01-01' },
        { account_name: 'Cost of Goods Sold', amount: 60000, date: '2024-01-01' },
        { account_name: 'Operating Expenses', amount: 25000, date: '2024-01-01' },
        { account_name: 'Net Income', amount: 15000, date: '2024-01-01' }
      ],
      summary: { totalRows: 4, totalColumns: 3, generatedAt: new Date().toISOString(), executionTime: 150 }
    }
  }

  async exportReport(reportId: string, format: 'PDF' | 'EXCEL' | 'CSV' | 'HTML') {
    return {
      downloadUrl: `/api/reports/${reportId}/download?format=${format}&token=${Date.now()}`,
      format,
      size: Math.floor(Math.random() * 1000000) + 100000,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  async validateReportConfig(config: ReportConfig) {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config.dataSource) errors.push('Data source is required')
    if (!config.columns || config.columns.length === 0) errors.push('At least one column is required')

    return { isValid: errors.length === 0, errors, warnings }
  }
}

export const customReportBuilderService = new CustomReportBuilderService()
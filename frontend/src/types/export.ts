/**
 * 支持的导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * 导出配置
 */
export interface ExportConfig {
  /** 数据库名称，用于生成文件名 */
  dbName: string;
  /** 导出格式 */
  format: ExportFormat;
  /** 列名数组 */
  columns: string[];
  /** 数据行数组 */
  rows: Record<string, unknown>[];
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 导出的文件名（成功时） */
  filename?: string;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 导出菜单项
 */
export interface ExportMenuItem {
  key: ExportFormat;
  label: string;
  icon: React.ReactNode;
}


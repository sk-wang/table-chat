/**
 * 导出工具函数
 * 支持 CSV、JSON、XLSX 格式导出
 */

import type { ExportFormat } from '../../types/export';

/**
 * 转义 CSV 单元格值
 * 处理逗号、引号、换行符
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // 如果值包含逗号、引号或换行符，需要用双引号包裹
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    // 双引号需要转义为两个双引号
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * 将查询结果导出为 CSV 格式
 * 遵循 RFC 4180 标准
 * 
 * @param columns 列名数组
 * @param rows 数据行数组
 * @returns CSV 字符串，包含 UTF-8 BOM
 */
export function exportToCSV(columns: string[], rows: Record<string, unknown>[]): string {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  
  // 生成表头
  const header = columns.map(col => escapeCSVValue(col)).join(',');
  
  // 生成数据行
  const dataRows = rows.map(row => {
    return columns.map(col => escapeCSVValue(row[col])).join(',');
  });
  
  // 使用 CRLF 作为行分隔符
  return BOM + [header, ...dataRows].join('\r\n');
}

/**
 * 格式化值用于 JSON 导出
 * 处理特殊类型（Date、Buffer 等）
 */
function formatValueForJSON(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  // 处理 Buffer 或 ArrayBuffer
  if (
    (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) ||
    value instanceof ArrayBuffer
  ) {
    return '[binary]';
  }

  return value;
}

/**
 * 将查询结果导出为 JSON 格式
 * 
 * @param columns 列名数组
 * @param rows 数据行数组
 * @returns JSON 字符串，2 空格缩进
 */
export function exportToJSON(columns: string[], rows: Record<string, unknown>[]): string {
  // 格式化数据
  const formattedRows = rows.map(row => {
    const formattedRow: Record<string, unknown> = {};
    columns.forEach(col => {
      formattedRow[col] = formatValueForJSON(row[col]);
    });
    return formattedRow;
  });
  
  return JSON.stringify(formattedRows, null, 2);
}

/**
 * 将查询结果导出为 XLSX 格式
 * 使用动态导入加载 xlsx 库
 * 
 * @param columns 列名数组
 * @param rows 数据行数组
 * @returns Promise<Blob> XLSX 文件的 Blob 对象
 */
export async function exportToXLSX(
  columns: string[],
  rows: Record<string, unknown>[]
): Promise<Blob> {
  // 动态导入 xlsx 库
  const XLSX = await import('xlsx');

  // 准备数据：第一行为表头
  const data = [
    columns,
    ...rows.map(row => columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return '';
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (
        (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) ||
        value instanceof ArrayBuffer
      ) {
        return '[binary]';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    }))
  ];

  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 自动列宽
  const columnWidths = columns.map((col, idx) => {
    const maxLength = Math.max(
      col.length,
      ...rows.slice(0, 100).map(row => {
        const value = row[columns[idx]];
        return String(value).length;
      })
    );
    return { wch: Math.min(maxLength + 2, 50) }; // 限制最大宽度为 50
  });
  worksheet['!cols'] = columnWidths;

  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // 生成 XLSX 文件
  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([xlsxData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * 触发浏览器下载 Blob
 * 
 * @param blob 文件内容
 * @param filename 文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 清理文件名中的特殊字符
 * 
 * @param name 原始文件名
 * @returns 清理后的文件名
 */
function sanitizeFilename(name: string): string {
  // 替换特殊字符为下划线
  return name.replace(/[/\\:*?"<>|\s]/g, '_');
}

/**
 * 生成导出文件名
 * 格式：{dbName}_{yyyyMMdd_HHmmss}.{ext}
 * 
 * @param dbName 数据库名称
 * @param format 导出格式
 * @returns 格式化的文件名
 */
export function generateFilename(dbName: string, format: ExportFormat): string {
  const sanitizedDbName = sanitizeFilename(dbName);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  
  return `${sanitizedDbName}_${timestamp}.${format}`;
}

/**
 * 导出查询结果
 * 主入口函数
 * 
 * @param dbName 数据库名称
 * @param format 导出格式
 * @param columns 列名数组
 * @param rows 数据行数组
 */
export async function exportQueryResult(
  dbName: string,
  format: ExportFormat,
  columns: string[],
  rows: Record<string, unknown>[]
): Promise<void> {
  const filename = generateFilename(dbName, format);

  switch (format) {
    case 'csv': {
      const csvContent = exportToCSV(columns, rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, filename);
      break;
    }

    case 'json': {
      const jsonContent = exportToJSON(columns, rows);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      downloadBlob(blob, filename);
      break;
    }

    case 'xlsx': {
      const xlsxBlob = await exportToXLSX(columns, rows);
      downloadBlob(xlsxBlob, filename);
      break;
    }

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}


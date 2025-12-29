import React, { useState } from 'react';
import { Button, Dropdown, App } from 'antd';
import { DownloadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { QueryResult } from '../../types';
import { exportQueryResult } from './exportUtils';
import type { ExportFormat } from '../../types/export';

interface ExportButtonProps {
  /** 查询结果 */
  result: QueryResult | null;
  /** 数据库名称 */
  dbName: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 导出按钮组件
 * 提供 CSV、JSON、XLSX 三种导出格式
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  result,
  dbName,
  disabled = false,
}) => {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  // 检查是否有可导出的数据
  const hasData = result && result.rows && result.rows.length > 0;
  const isDisabled = disabled || !hasData;

  /**
   * 处理导出操作
   */
  const handleExport = async (format: ExportFormat) => {
    if (!result || !result.rows || result.rows.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    try {
      setExporting(true);
      
      await exportQueryResult(
        dbName,
        format,
        result.columns,
        result.rows
      );

      message.success(`导出 ${format.toUpperCase()} 成功`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(false);
    }
  };

  // 下拉菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: 'csv',
      label: '导出 CSV',
      icon: <FileTextOutlined />,
      onClick: () => handleExport('csv'),
    },
    {
      key: 'json',
      label: '导出 JSON',
      icon: <FileTextOutlined />,
      onClick: () => handleExport('json'),
    },
    {
      key: 'xlsx',
      label: '导出 XLSX',
      icon: <FileExcelOutlined />,
      onClick: () => handleExport('xlsx'),
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      disabled={isDisabled}
      trigger={['click']}
    >
      <Button
        icon={<DownloadOutlined />}
        disabled={isDisabled}
        loading={exporting}
      >
        导出
      </Button>
    </Dropdown>
  );
};


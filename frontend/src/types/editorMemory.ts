/**
 * SQL编辑器记忆类型定义
 *
 * 定义前端使用的TypeScript接口，与后端API响应格式对应
 */

/**
 * SQL编辑器记忆
 */
export interface EditorMemory {
  /** 记录ID */
  id: number;

  /** 数据库连接ID */
  connectionId: string;

  /** 编辑器内容 */
  content: string;

  /** 创建时间（ISO 8601格式） */
  createdAt: string;
}

/**
 * 创建SQL编辑器记忆请求
 */
export interface EditorMemoryCreate {
  /** 数据库连接ID */
  connectionId: string;

  /** 编辑器内容 */
  content: string;
}

/**
 * SQL编辑器记忆列表响应
 */
export interface EditorMemoryList {
  /** 记忆列表 */
  items: EditorMemory[];

  /** 总数 */
  total: number;
}

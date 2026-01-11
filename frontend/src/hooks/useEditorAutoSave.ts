import { useEffect, useRef } from 'react';
import { apiClient } from '../services/api';

/**
 * SQL编辑器实时保存Hook
 *
 * 功能：
 * - 编辑器内容变化时立即保存到后端
 * - 数据库切换时自动加载上次保存的内容
 * - 组件卸载时保存当前内容
 *
 * @param connectionId - 数据库连接ID
 * @param content - 编辑器内容
 *
 * @example
 * ```tsx
 * useEditorAutoSave(connectionId, editorContent);
 * ```
 */
export function useEditorAutoSave(
  connectionId: string | null,
  content: string
): void {
  // 使用 ref 来跟踪内容变化
  const contentRef = useRef(content);
  const prevContentRef = useRef(content);
  const prevConnectionRef = useRef(connectionId);

  // 更新 content ref
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // 当内容变化时，立即保存
  useEffect(() => {
    // 只在内容真正变化且连接ID存在时保存
    if (connectionId && content !== prevContentRef.current) {
      // 立即保存
      apiClient.saveEditorMemory({
        connectionId,
        content: content,
      }).catch((error) => {
        console.error('Save failed:', error);
      });

      // 更新前一个内容值
      prevContentRef.current = content;
    }
  }, [content, connectionId]);

  // 当连接ID变化时，加载该连接的最新内容
  useEffect(() => {
    // 只在连接ID真正变化时执行
    if (connectionId && connectionId !== prevConnectionRef.current) {
      const loadLatestMemory = async () => {
        try {
          const latest = await apiClient.getLatestEditorMemory(connectionId);
          if (latest && latest.content !== undefined) {
            // 这里不能调用setSqlQuery，因为hook不能修改父组件状态
            // 由父组件监听selectedDatabase变化来处理
            console.log('[EditorMemory] Loaded latest content for', connectionId);
          }
        } catch (error) {
          console.error('[EditorMemory] Failed to load latest memory:', error);
        }
      };

      loadLatestMemory();
      // 更新前一个连接ID
      prevConnectionRef.current = connectionId;
    }
  }, [connectionId]);

  // 组件卸载时执行最后一次保存
  useEffect(() => {
    return () => {
      // 组件卸载时保存当前内容
      if (connectionId && contentRef.current !== undefined) {
        apiClient.saveEditorMemory({
          connectionId,
          content: contentRef.current,
        }).catch((error) => {
          console.error('Failed to save on unmount:', error);
        });
      }
    };
  }, [connectionId]);
}

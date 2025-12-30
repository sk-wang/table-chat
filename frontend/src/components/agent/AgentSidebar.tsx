import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import {
  RobotOutlined,
  CloseOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import { AgentChat } from './AgentChat';
import './styles.css';

interface AgentSidebarProps {
  dbName: string;
  disabled?: boolean;
  onSQLGenerated?: (sql: string) => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 420;
const COLLAPSED_WIDTH = 48;

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  dbName,
  disabled = false,
  onSQLGenerated,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('agent_sidebar_width');
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  // Save width to localStorage
  useEffect(() => {
    if (!collapsed && !isFullscreen) {
      localStorage.setItem('agent_sidebar_width', width.toString());
    }
  }, [width, collapsed, isFullscreen]);

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isFullscreen) return;
      
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isFullscreen]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => !prev);
    if (isFullscreen) setIsFullscreen(false);
  }, [isFullscreen]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle SQL generated from Agent
  const handleSQLGenerated = useCallback((sql: string) => {
    onSQLGenerated?.(sql);
  }, [onSQLGenerated]);

  // Keyboard shortcut: Cmd/Ctrl + Shift + A to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const actualWidth = isFullscreen ? '100%' : collapsed ? COLLAPSED_WIDTH : width;

  return (
    <div
      ref={sidebarRef}
      className={`agent-sidebar ${collapsed ? 'collapsed' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        width: actualWidth,
        minWidth: collapsed ? COLLAPSED_WIDTH : MIN_WIDTH,
        transition: isResizing ? 'none' : 'width 0.2s ease-out',
      }}
    >
      {/* Resize handle */}
      {!collapsed && !isFullscreen && (
        <div
          ref={resizeRef}
          className="agent-sidebar-resize"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Collapsed state - just show toggle button */}
      {collapsed && (
        <div className="agent-sidebar-collapsed">
          <Tooltip title="打开 AI Agent (⌘⇧A)" placement="left">
            <Button
              type="text"
              icon={<RobotOutlined />}
              onClick={toggleSidebar}
              className="agent-sidebar-toggle"
            />
          </Tooltip>
        </div>
      )}

      {/* Expanded state */}
      {!collapsed && (
        <div className="agent-sidebar-content">
          {/* Header */}
          <div className="agent-sidebar-header">
            <div className="agent-sidebar-title">
              <RobotOutlined className="agent-sidebar-icon" />
              <span>AI Agent</span>
            </div>
            <div className="agent-sidebar-actions">
              <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
                <Button
                  type="text"
                  size="small"
                  icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                  onClick={toggleFullscreen}
                />
              </Tooltip>
              <Tooltip title="关闭 (⌘⇧A)">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={toggleSidebar}
                />
              </Tooltip>
            </div>
          </div>

          {/* Agent Chat */}
          <div className="agent-sidebar-body">
            <AgentChat
              dbName={dbName}
              disabled={disabled}
              onSQLGenerated={handleSQLGenerated}
            />
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getQueryPanelRatio, setQueryPanelRatio } from '../../services/storage';

export interface ResizableSplitPaneProps {
  /** Top panel content */
  topPanel: React.ReactNode;
  /** Bottom panel content */
  bottomPanel: React.ReactNode;
  /** Default editor ratio (0.1-0.9), default 0.4 */
  defaultRatio?: number;
  /** Top panel minimum height (px), default 100 */
  minTopHeight?: number;
  /** Bottom panel minimum height (px), default 100 */
  minBottomHeight?: number;
  /** localStorage persistence key, no persistence if not provided */
  storageKey?: string;
  /** Ratio change callback */
  onRatioChange?: (ratio: number) => void;
}

/**
 * Resizable split pane component with horizontal divider
 * Allows users to adjust the height ratio between top and bottom panels
 */
export const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  topPanel,
  bottomPanel,
  defaultRatio = 0.4,
  minTopHeight = 100,
  minBottomHeight = 100,
  storageKey,
  onRatioChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize ratio from localStorage if storageKey is provided
  const getInitialRatio = useCallback((): number => {
    if (storageKey) {
      try {
        const cachedRatio = getQueryPanelRatio();
        if (cachedRatio !== null) {
          return cachedRatio;
        }
      } catch (error) {
        console.warn('[ResizableSplitPane] Failed to load ratio from storage:', error);
      }
    }
    return defaultRatio;
  }, [storageKey, defaultRatio]);

  const [ratio, setRatio] = useState<number>(getInitialRatio);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerHeight = containerRect.height;

      // Calculate new top height based on mouse position
      const mouseY = e.clientY - containerRect.top;
      const newRatio = mouseY / containerHeight;

      // Calculate actual heights to check constraints
      const newTopHeight = newRatio * containerHeight;
      const newBottomHeight = (1 - newRatio) * containerHeight;

      // Apply minimum height constraints
      if (newTopHeight >= minTopHeight && newBottomHeight >= minBottomHeight) {
        setRatio(newRatio);
        onRatioChange?.(newRatio);
      }
    },
    [isDragging, minTopHeight, minBottomHeight, onRatioChange]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);

      // Save to localStorage if storageKey is provided
      if (storageKey) {
        try {
          setQueryPanelRatio(ratio);
        } catch (error) {
          console.warn('[ResizableSplitPane] Failed to save ratio to storage:', error);
        }
      }
    }
  }, [isDragging, storageKey, ratio]);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Top Panel */}
      <div
        style={{
          height: `${ratio * 100}%`,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {topPanel}
      </div>

      {/* Resizable Divider */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: '8px',
          background: isDragging ? '#4a4a4a' : '#323232',
          cursor: 'ns-resize',
          flexShrink: 0,
          transition: isDragging ? 'none' : 'background 0.2s',
          position: 'relative',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = '#4a4a4a';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = '#323232';
          }
        }}
      />

      {/* Bottom Panel */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {bottomPanel}
      </div>
    </div>
  );
};

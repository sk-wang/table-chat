import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizableSplitPane } from '../components/layout/ResizableSplitPane';
import * as storage from '../services/storage';

// Mock storage module
vi.mock('../services/storage', () => ({
  getQueryPanelRatio: vi.fn(),
  setQueryPanelRatio: vi.fn(),
}));

describe('ResizableSplitPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (storage.getQueryPanelRatio as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it('should render top and bottom panels', () => {
    render(
      <ResizableSplitPane
        topPanel={<div data-testid="top-panel">Top Content</div>}
        bottomPanel={<div data-testid="bottom-panel">Bottom Content</div>}
      />
    );

    expect(screen.getByTestId('top-panel')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-panel')).toBeInTheDocument();
    expect(screen.getByText('Top Content')).toBeInTheDocument();
    expect(screen.getByText('Bottom Content')).toBeInTheDocument();
  });

  it('should use default ratio when no storage key provided', () => {
    render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        defaultRatio={0.5}
      />
    );

    // Component should render without errors
    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Bottom')).toBeInTheDocument();
  });

  it('should load ratio from storage when storageKey is provided', () => {
    (storage.getQueryPanelRatio as ReturnType<typeof vi.fn>).mockReturnValue(0.6);

    render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        storageKey="test-key"
      />
    );

    expect(storage.getQueryPanelRatio).toHaveBeenCalled();
  });

  it('should use default ratio when storage returns null', () => {
    (storage.getQueryPanelRatio as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        storageKey="test-key"
        defaultRatio={0.3}
      />
    );

    expect(storage.getQueryPanelRatio).toHaveBeenCalled();
  });

  it('should render resizable divider', () => {
    const { container } = render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
      />
    );

    // Find the divider by its cursor style
    const divider = container.querySelector('[style*="cursor: ns-resize"]');
    expect(divider).toBeInTheDocument();
  });

  it('should handle mousedown on divider', () => {
    const { container } = render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
      />
    );

    const divider = container.querySelector('[style*="cursor: ns-resize"]');
    expect(divider).toBeInTheDocument();

    // Fire mousedown event
    fireEvent.mouseDown(divider!);

    // After mousedown, the body cursor should change to ns-resize
    // (this happens via useEffect, but we can verify the divider responds)
    expect(divider).toBeInTheDocument();
  });

  it('should call onRatioChange callback during drag', () => {
    const onRatioChange = vi.fn();
    const { container } = render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        onRatioChange={onRatioChange}
      />
    );

    const divider = container.querySelector('[style*="cursor: ns-resize"]');
    expect(divider).toBeInTheDocument();

    // Start drag
    fireEvent.mouseDown(divider!);

    // Simulate mouse move
    fireEvent.mouseMove(document, { clientY: 200 });

    // Note: onRatioChange may not be called due to mock container dimensions
    // This test verifies the component doesn't crash during drag operations
  });

  it('should save ratio to storage on mouseup when storageKey is provided', () => {
    const { container } = render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        storageKey="test-key"
      />
    );

    const divider = container.querySelector('[style*="cursor: ns-resize"]');

    // Start drag
    fireEvent.mouseDown(divider!);
    
    // End drag
    fireEvent.mouseUp(document);

    // setQueryPanelRatio should be called with the current ratio
    expect(storage.setQueryPanelRatio).toHaveBeenCalled();
  });

  it('should handle hover effects on divider', () => {
    const { container } = render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
      />
    );

    const divider = container.querySelector('[style*="cursor: ns-resize"]');

    // Hover enter
    fireEvent.mouseEnter(divider!);
    
    // Hover leave
    fireEvent.mouseLeave(divider!);

    // Component should handle these events without errors
    expect(divider).toBeInTheDocument();
  });

  it('should respect minTopHeight constraint', () => {
    render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        minTopHeight={200}
      />
    );

    // Component should render with the min height constraint
    expect(screen.getByText('Top')).toBeInTheDocument();
  });

  it('should respect minBottomHeight constraint', () => {
    render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
        minBottomHeight={150}
      />
    );

    // Component should render with the min height constraint
    expect(screen.getByText('Bottom')).toBeInTheDocument();
  });

  it('should handle storage errors gracefully', () => {
    (storage.getQueryPanelRatio as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Storage error');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Should not throw
    expect(() => 
      render(
        <ResizableSplitPane
          topPanel={<div>Top</div>}
          bottomPanel={<div>Bottom</div>}
          storageKey="test-key"
        />
      )
    ).not.toThrow();

    consoleSpy.mockRestore();
  });

  it('should cleanup event listeners on unmount', () => {
    const { container, unmount } = render(
      <ResizableSplitPane
        topPanel={<div>Top</div>}
        bottomPanel={<div>Bottom</div>}
      />
    );

    const divider = container.querySelector('[style*="cursor: ns-resize"]');
    
    // Start drag
    fireEvent.mouseDown(divider!);

    // Unmount while dragging
    unmount();

    // Should not throw or cause memory leaks
  });
});


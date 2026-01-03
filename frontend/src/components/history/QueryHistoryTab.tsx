import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { QueryHistoryList } from './QueryHistoryList';
import { QueryHistorySearch } from './QueryHistorySearch';
import { apiClient } from '../../services/api';
import type { QueryHistoryItem } from '../../types/history';

interface QueryHistoryTabProps {
  dbName: string;
  onSelectHistory: (sql: string, naturalQuery?: string | null) => void;
  refreshTrigger?: number;
}

export function QueryHistoryTab({ dbName, onSelectHistory, refreshTrigger }: QueryHistoryTabProps) {
  const [items, setItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Track if this is the first load for the current dbName
  const isFirstLoadRef = useRef(true);
  const currentDbRef = useRef(dbName);

  // Load history data
  const loadHistory = useCallback(async (reset = false, showLoading = true) => {
    if (!dbName) return;

    // If it's a reset and we want to show loading, set it
    // But if it's the very first load for this db, we might want to be silent
    if (showLoading && (!isFirstLoadRef.current || reset)) {
      setLoading(true);
    }
    
    try {
      const cursor = reset ? undefined : nextCursor ?? undefined;
      const response = await apiClient.getQueryHistory(dbName, 20, cursor);

      if (reset) {
        setItems(response.items);
      } else {
        setItems((prev) => [...prev, ...response.items]);
      }
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
      setInitialized(true);
    } catch (error) {
      message.error(`Failed to load history: ${error}`);
    } finally {
      setLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [dbName, nextCursor]);

  // Search history
  const searchHistory = useCallback(async (query: string) => {
    if (!dbName || !query.trim()) {
      // Reset to full list if query is empty
      setSearchQuery('');
      loadHistory(true, true);
      return;
    }

    setSearchQuery(query);
    setSearchLoading(true);
    try {
      const response = await apiClient.searchQueryHistory(dbName, query);
      setItems(response.items);
      setHasMore(false);
      setNextCursor(null);
    } catch (error) {
      message.error(`Search failed: ${error}`);
    } finally {
      setSearchLoading(false);
    }
  }, [dbName, loadHistory]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    loadHistory(true, true);
  }, [loadHistory]);

  // Load on mount and when dbName changes
  useEffect(() => {
    // If dbName actually changed, reset everything
    if (currentDbRef.current !== dbName) {
      currentDbRef.current = dbName;
      isFirstLoadRef.current = true;
      setNextCursor(null);
      setSearchQuery('');
      setInitialized(false);
      // Don't clear items immediately to avoid empty table flash
      loadHistory(true, false);
    } else if (!initialized) {
      // First mount
      loadHistory(true, false);
    }
  }, [dbName, loadHistory, initialized]);

  // Handle external refresh trigger (e.g. after query execution)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0 && initialized) {
      // Silent refresh for external triggers to avoid flicker
      loadHistory(true, false);
    }
  }, [refreshTrigger, loadHistory, initialized]);

  // Handle history item selection
  const handleSelectHistory = (item: QueryHistoryItem) => {
    onSelectHistory(item.sqlContent, item.naturalQuery);
  };

  // Handle refresh - always show loading for explicit refresh
  const handleRefresh = () => {
    setSearchQuery('');
    loadHistory(true, true);
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const emptyText = isSearchMode
    ? `No history found containing "${searchQuery}"`
    : 'No execution history yet. Executed queries will be displayed here';

  // Show table loading state
  // 1. searchLoading is always shown
  // 2. loading is shown if it's not the first quiet load (initialized)
  // 3. If NOT initialized, we treat it as loading to avoid empty state flicker
  const showTableLoading = searchLoading || loading || !initialized;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search and actions bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <QueryHistorySearch
            onSearch={searchHistory}
            onClear={clearSearch}
            loading={searchLoading}
            value={searchQuery}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading && !searchLoading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* History table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
        <QueryHistoryList
          items={items}
          loading={showTableLoading}
          onSelectHistory={handleSelectHistory}
          emptyText={emptyText}
        />
      </div>

      {/* Load more button */}
      {hasMore && !isSearchMode && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Button onClick={() => loadHistory(false, true)} loading={loading} size="small">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

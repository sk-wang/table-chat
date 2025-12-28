import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Typography } from 'antd';
import type { TableMetadata } from '../../types/metadata';

const { Text } = Typography;
const { Search } = Input;

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface TableSearchInputProps {
  tables: TableMetadata[];
  onSearch: (query: string, filteredTables: TableMetadata[]) => void;
  placeholder?: string;
}

export const TableSearchInput: React.FC<TableSearchInputProps> = ({
  tables,
  onSearch,
  placeholder = 'Search tables...',
}) => {
  const [query, setQuery] = useState('');
  const [resultCount, setResultCount] = useState(0);

  // Debounce the query to avoid excessive filtering
  const debouncedQuery = useDebounce(query, 300);

  // Filter tables based on search query (case-insensitive substring match)
  const filterTables = useCallback((searchQuery: string, tableList: TableMetadata[]): TableMetadata[] => {
    if (!searchQuery.trim()) {
      return tableList;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return tableList.filter((table) =>
      table.tableName.toLowerCase().includes(lowerQuery)
    );
  }, []);

  // Update search results when debounced query changes
  useEffect(() => {
    const filtered = filterTables(debouncedQuery, tables);
    setResultCount(filtered.length);
    onSearch(debouncedQuery, filtered);
  }, [debouncedQuery, tables, filterTables, onSearch]);

  const handleSearch = (value: string) => {
    setQuery(value);
  };

  const handleClear = () => {
    setQuery('');
    setResultCount(0);
    onSearch('', tables);
  };

  // Calculate display text for result count
  const resultText = useMemo(() => {
    if (!query.trim()) return null;
    if (resultCount === 0) {
      return <Text style={{ color: '#808080', fontSize: 10 }}>No tables found</Text>;
    }
    return <Text style={{ color: '#808080', fontSize: 10 }}>{resultCount} table{resultCount !== 1 ? 's' : ''} found</Text>;
  }, [query, resultCount]);

  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #323232' }}>
      <Search
        placeholder={placeholder}
        allowClear
        onSearch={handleSearch}
        onChange={(e) => handleSearch(e.target.value)}
        value={query}
        onClear={handleClear}
        size="small"
        style={{ width: '100%' }}
        aria-label="Search database tables"
        styles={{
          input: {
            background: '#2b2b2b',
            borderColor: '#323232',
            color: '#a9b7c6',
            fontSize: 12,
          },
        }}
      />
      {resultText && (
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          {resultText}
        </div>
      )}
    </div>
  );
};

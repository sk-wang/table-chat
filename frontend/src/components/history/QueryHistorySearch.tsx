import { useState, useEffect, useCallback } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Search } = Input;

interface QueryHistorySearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  loading: boolean;
  value: string;
}

export function QueryHistorySearch({
  onSearch,
  onClear,
  loading,
  value,
}: QueryHistorySearchProps) {
  const [inputValue, setInputValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced search
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim()) {
            onSearch(query);
          } else {
            onClear();
          }
        }, 300);
      };
    })(),
    [onSearch, onClear]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debouncedSearch(newValue);
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      onSearch(query);
    } else {
      onClear();
    }
  };

  return (
    <Search
      placeholder="搜索 SQL 或自然语言..."
      allowClear
      enterButton={<SearchOutlined />}
      value={inputValue}
      onChange={handleChange}
      onSearch={handleSearch}
      loading={loading}
      style={{ width: 300 }}
    />
  );
}


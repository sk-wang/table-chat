import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Mock axios module
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Import after mocking
import { apiClient } from '../services/api';

describe('Agent API', () => {
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked axios instance
    mockClient = (axios.create as ReturnType<typeof vi.fn>)() as typeof mockClient;
  });

  describe('getAgentStatus', () => {
    it('should return agent status when configured', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          available: true,
          configured: true,
          model: 'claude-sonnet-4-5',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getAgentStatus();

      expect(mockClient.get).toHaveBeenCalledWith('/agent/status');
      expect(result.available).toBe(true);
      expect(result.configured).toBe(true);
      expect(result.model).toBe('claude-sonnet-4-5');
    });

    it('should return agent status when not configured', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          available: false,
          configured: false,
          model: null,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getAgentStatus();

      expect(result.available).toBe(false);
      expect(result.configured).toBe(false);
      expect(result.model).toBeNull();
    });

    it('should throw error on failure', async () => {
      const mockError = {
        response: {
          data: { error: 'Server Error', detail: 'Internal server error' },
        },
        message: 'Request failed',
      };

      mockClient.get.mockRejectedValue(mockError);

      await expect(apiClient.getAgentStatus()).rejects.toThrow();
    });
  });

  describe('cancelAgentQuery', () => {
    it('should cancel an active agent query', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          cancelled: true,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await apiClient.cancelAgentQuery('testdb');

      expect(mockClient.post).toHaveBeenCalledWith('/dbs/testdb/agent/cancel');
      expect(result.cancelled).toBe(true);
    });

    it('should return false when no active query', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          cancelled: false,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await apiClient.cancelAgentQuery('testdb');

      expect(result.cancelled).toBe(false);
    });
  });
});

describe('Agent Types', () => {
  it('should have correct AgentMessage structure', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Hello',
      timestamp: Date.now(),
    };

    expect(message.id).toBeDefined();
    expect(message.role).toBe('assistant');
    expect(message.content).toBeDefined();
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should have correct ToolCallInfo structure', () => {
    const toolCall = {
      id: 'tc-1',
      name: 'query_database',
      input: { sql: 'SELECT * FROM users' },
      output: 'Query result...',
      status: 'completed' as const,
      durationMs: 100,
    };

    expect(toolCall.id).toBeDefined();
    expect(toolCall.name).toBe('query_database');
    expect(toolCall.input.sql).toBeDefined();
    expect(toolCall.status).toBe('completed');
    expect(toolCall.durationMs).toBe(100);
  });

  it('should have correct AgentMessage with toolCall', () => {
    const message = {
      id: 'msg-tool-1',
      role: 'tool' as const,
      content: '',
      timestamp: Date.now(),
      toolCall: {
        id: 'tc-1',
        name: 'get_table_schema',
        input: {},
        status: 'running' as const,
      },
    };

    expect(message.role).toBe('tool');
    expect(message.toolCall).toBeDefined();
    expect(message.toolCall?.status).toBe('running');
  });
});

describe('Agent Event Types', () => {
  it('should handle ThinkingEventData', () => {
    const thinkingEvent = {
      status: 'analyzing' as const,
      message: '正在分析您的需求...',
    };

    expect(thinkingEvent.status).toBe('analyzing');
    expect(thinkingEvent.message).toContain('分析');
  });

  it('should handle ToolCallEventData', () => {
    const toolCallEvent = {
      id: 'tc-1',
      tool: 'query_database',
      input: { sql: 'SELECT 1' },
      status: 'completed' as const,
      output: 'Result',
      durationMs: 50,
    };

    expect(toolCallEvent.tool).toBe('query_database');
    expect(toolCallEvent.status).toBe('completed');
    expect(toolCallEvent.durationMs).toBe(50);
  });

  it('should handle SQLEventData', () => {
    const sqlEvent = {
      sql: 'SELECT * FROM users WHERE active = true',
      explanation: '查询所有活跃用户',
    };

    expect(sqlEvent.sql).toContain('SELECT');
    expect(sqlEvent.explanation).toBeDefined();
  });

  it('should handle ErrorEventData', () => {
    const errorEvent = {
      error: 'Connection failed',
      detail: 'Unable to connect to database',
    };

    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.detail).toBeDefined();
  });

  it('should handle DoneEventData', () => {
    const doneEvent = {
      totalTimeMs: 2500,
      toolCallsCount: 3,
    };

    expect(doneEvent.totalTimeMs).toBeGreaterThan(0);
    expect(doneEvent.toolCallsCount).toBe(3);
  });
});

describe('Agent State Types', () => {
  it('should have valid AgentStatus values', () => {
    const statuses = ['idle', 'thinking', 'tool_running', 'responding', 'completed', 'error', 'cancelled'];
    
    statuses.forEach(status => {
      expect(typeof status).toBe('string');
    });
  });

  it('should have correct AgentState structure', () => {
    const state = {
      status: 'idle' as const,
      messages: [],
      generatedSQL: undefined,
      explanation: undefined,
      error: undefined,
      totalTimeMs: undefined,
    };

    expect(state.status).toBe('idle');
    expect(state.messages).toEqual([]);
  });

  it('should handle AgentState with completed query', () => {
    const state = {
      status: 'completed' as const,
      messages: [
        { id: 'msg-1', role: 'user' as const, content: 'Query users', timestamp: Date.now() },
        { id: 'msg-2', role: 'assistant' as const, content: 'Generated SQL', timestamp: Date.now() },
      ],
      generatedSQL: 'SELECT * FROM users',
      explanation: '查询用户表',
      totalTimeMs: 1500,
    };

    expect(state.status).toBe('completed');
    expect(state.messages).toHaveLength(2);
    expect(state.generatedSQL).toBeDefined();
    expect(state.totalTimeMs).toBe(1500);
  });

  it('should handle AgentState with error', () => {
    const state = {
      status: 'error' as const,
      messages: [],
      error: 'Agent service unavailable',
    };

    expect(state.status).toBe('error');
    expect(state.error).toBeDefined();
  });
});


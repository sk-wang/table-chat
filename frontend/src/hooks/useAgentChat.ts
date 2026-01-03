import { useReducer, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api';
import type {
  AgentMessage,
  AgentStatus,
  ThinkingEventData,
  ToolCallEventData,
  MessageEventData,
  SQLEventData,
  ErrorEventData,
  DoneEventData,
  ConversationTurn,
} from '../types/agent';

// State type
interface AgentState {
  status: AgentStatus;
  messages: AgentMessage[];
  streamingText: string;
  thinkingMessage: string;
  thinkingStatus: 'analyzing' | 'planning' | 'generating';
  generatedSQL: string | null;
  error: string | null;
}

// Action types
type AgentAction =
  | { type: 'START'; prompt: string }
  | { type: 'SET_THINKING'; message: string; status?: 'analyzing' | 'planning' | 'generating' }
  | { type: 'TEXT_DELTA'; text: string }
  | { type: 'FLUSH_STREAMING' }
  | { type: 'ADD_MESSAGE'; message: AgentMessage }
  | { type: 'UPDATE_TOOL_CALL'; data: ToolCallEventData }
  | { type: 'SET_SQL'; sql: string; explanation?: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'DONE' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

// Initial state
const initialState: AgentState = {
  status: 'idle',
  messages: [],
  streamingText: '',
  thinkingMessage: '',
  thinkingStatus: 'analyzing',
  generatedSQL: null,
  error: null,
};

// Reducer
function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'thinking',
        thinkingMessage: 'Analyzing your requirements...',
        thinkingStatus: 'analyzing',
        error: null,
        generatedSQL: null,
        streamingText: '',
        messages: [
          ...state.messages,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: action.prompt,
            timestamp: Date.now(),
          },
        ],
      };

    case 'SET_THINKING':
      return {
        ...state,
        status: 'thinking',
        thinkingMessage: action.message,
        thinkingStatus: action.status || state.thinkingStatus,
        streamingText: '',
      };

    case 'TEXT_DELTA':
      return {
        ...state,
        status: 'responding',
        thinkingMessage: '',
        streamingText: state.streamingText + action.text,
      };

    case 'FLUSH_STREAMING':
      if (!state.streamingText) return state;
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `assistant-stream-${Date.now()}`,
            role: 'assistant',
            content: state.streamingText,
            timestamp: Date.now(),
          },
        ],
        streamingText: '',
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        status: 'responding',
        thinkingMessage: '',
        streamingText: '',
        messages: [...state.messages, action.message],
      };

    case 'UPDATE_TOOL_CALL': {
      const existingIndex = state.messages.findIndex(
        m => m.role === 'tool' && m.toolCall?.id === action.data.id
      );

      const toolMessage: AgentMessage = {
        id: `tool-${action.data.id}`,
        role: 'tool',
        content: '',
        timestamp: Date.now(),
        toolCall: {
          id: action.data.id,
          name: action.data.tool,
          input: action.data.input,
          output: action.data.output,
          status: action.data.status,
          durationMs: action.data.durationMs,
        },
      };

      // Flush streaming text before adding tool call
      let newMessages = state.messages;
      if (state.streamingText) {
        newMessages = [
          ...newMessages,
          {
            id: `assistant-stream-${Date.now()}`,
            role: 'assistant' as const,
            content: state.streamingText,
            timestamp: Date.now(),
          },
        ];
      }

      if (existingIndex >= 0) {
        newMessages = [...newMessages];
        newMessages[existingIndex] = toolMessage;
      } else {
        newMessages = [...newMessages, toolMessage];
      }

      return {
        ...state,
        status: 'tool_running',
        thinkingMessage: action.data.status === 'running' ? `Executing ${action.data.tool}...` : '',
        streamingText: '',
        messages: newMessages,
      };
    }

    case 'SET_SQL':
      return {
        ...state,
        generatedSQL: action.sql,
        messages: action.explanation
          ? [
              ...state.messages,
              {
                id: `sql-${Date.now()}`,
                role: 'assistant',
                content: `Generated SQL:\n\`\`\`sql\n${action.sql}\n\`\`\`\n\n${action.explanation}`,
                timestamp: Date.now(),
              },
            ]
          : state.messages,
      };

    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
        thinkingMessage: '',
        streamingText: '',
        error: action.error,
      };

    case 'DONE':
      return {
        ...state,
        status: 'completed',
        thinkingMessage: '',
        streamingText: '',
      };

    case 'CANCEL':
      return {
        ...state,
        status: 'cancelled',
        thinkingMessage: '',
        streamingText: '',
      };

    case 'RESET':
      return {
        ...state,
        status: 'idle',
      };

    default:
      return state;
  }
}

// Hook
interface UseAgentChatOptions {
  dbName: string;
  onSQLGenerated?: (sql: string) => void;
}

export function useAgentChat({ dbName, onSQLGenerated }: UseAgentChatOptions) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeout duration (2 minutes)
  const TIMEOUT_MS = 120000;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Extract conversation history from messages (last 3 complete rounds)
  const extractHistory = useCallback((messages: AgentMessage[]): ConversationTurn[] => {
    const history: ConversationTurn[] = [];

    // Find pairs of user + assistant messages (skip tool messages)
    let i = 0;
    while (i < messages.length) {
      // Find a user message
      if (messages[i].role === 'user') {
        const userPrompt = messages[i].content;

        // Find the next assistant message (skip tool messages)
        let j = i + 1;
        let assistantResponse = '';

        while (j < messages.length && messages[j].role !== 'user') {
          if (messages[j].role === 'assistant' && messages[j].content) {
            // Concatenate all assistant responses in this round
            assistantResponse += (assistantResponse ? '\n' : '') + messages[j].content;
          }
          j++;
        }

        // If we found both user and assistant, add to history
        if (userPrompt && assistantResponse) {
          history.push({
            user_prompt: userPrompt,
            assistant_response: assistantResponse,
          });
        }

        i = j; // Move to next round
      } else {
        i++;
      }
    }

    // Return only last 3 rounds
    return history.slice(-3);
  }, []);

  // Use refs to avoid dependency issues with callbacks
  const stateRef = useRef(state);
  const extractHistoryRef = useRef(extractHistory);
  
  // Update refs in useEffect to avoid accessing during render
  useEffect(() => {
    stateRef.current = state;
    extractHistoryRef.current = extractHistory;
  });

  // Send message
  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || !dbName || stateRef.current.status !== 'idle') return;

      // Extract history BEFORE dispatching START (which adds the new user message)
      const history = extractHistoryRef.current(stateRef.current.messages);

      dispatch({ type: 'START', prompt: prompt.trim() });

      const handlers = {
        onThinking: (data: ThinkingEventData) => {
          dispatch({ type: 'SET_THINKING', message: data.message, status: data.status });
        },
        onTextDelta: (data: { text: string }) => {
          dispatch({ type: 'TEXT_DELTA', text: data.text });
        },
        onToolCall: (data: ToolCallEventData) => {
          dispatch({ type: 'UPDATE_TOOL_CALL', data });
        },
        onMessage: (data: MessageEventData) => {
          dispatch({
            type: 'ADD_MESSAGE',
            message: {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: data.content,
              timestamp: Date.now(),
            },
          });
        },
        onSQL: (data: SQLEventData) => {
          dispatch({ type: 'SET_SQL', sql: data.sql, explanation: data.explanation });
        },
        onError: (data: ErrorEventData) => {
          const error = data.error + (data.detail ? `: ${data.detail}` : '');
          dispatch({ type: 'SET_ERROR', error });
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        },
        onDone: (_data: DoneEventData) => {
          dispatch({ type: 'DONE' });
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // Reset to idle after a short delay
          setTimeout(() => dispatch({ type: 'RESET' }), 500);
        },
      };

      abortControllerRef.current = apiClient.agentQuery(
        dbName,
        { prompt: prompt.trim(), history },
        handlers
      );

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          dispatch({ type: 'SET_ERROR', error: 'Request timeout, please try again. Agent response time exceeded the 2-minute limit.' });
        }
      }, TIMEOUT_MS);
    },
    [dbName]
  );

  // Cancel request
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'CANCEL' });
    setTimeout(() => dispatch({ type: 'RESET' }), 500);
  }, []);

  // Copy SQL to editor
  const copyToEditor = useCallback(() => {
    if (state.generatedSQL && onSQLGenerated) {
      onSQLGenerated(state.generatedSQL);
    }
  }, [state.generatedSQL, onSQLGenerated]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: '' });
  }, []);

  // Check if processing
  const isProcessing =
    state.status !== 'idle' &&
    state.status !== 'completed' &&
    state.status !== 'error' &&
    state.status !== 'cancelled';

  return {
    ...state,
    isProcessing,
    sendMessage,
    cancel,
    copyToEditor,
    clearError,
  };
}


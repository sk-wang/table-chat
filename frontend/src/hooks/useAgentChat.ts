import { useReducer, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api';
import * as conversationApi from '../services/conversationApi';
import { useConversation } from '../contexts/ConversationContext';
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
import type { ToolCallData } from '../types/conversation';

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
  | { type: 'RESET' }
  | { type: 'LOAD_HISTORY'; messages: AgentMessage[] };

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

    case 'DONE': {
      // Flush any remaining streaming text to messages before marking complete
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
      return {
        ...state,
        status: 'completed',
        thinkingMessage: '',
        streamingText: '',
        messages: newMessages,
      };
    }

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

    case 'LOAD_HISTORY':
      return {
        ...initialState,
        messages: action.messages,
        status: 'idle',
      };

    default:
      return state;
  }
}

// Hook
interface UseAgentChatOptions {
  dbName: string;
  connectionId?: string;
  onSQLGenerated?: (sql: string) => void;
}

export function useAgentChat({ dbName, connectionId, onSQLGenerated }: UseAgentChatOptions) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Conversation context for persistence
  const { 
    activeConversationId, 
    activeConversation,
    createConversation, 
    addMessage: addMessageToContext,
    generateTitle 
  } = useConversation();
  
  // Track if this is the first message in the conversation (for auto-title)
  const isFirstMessageRef = useRef(true);
  const conversationIdRef = useRef<string | null>(null);

  // Timeout duration (2 minutes)
  const TIMEOUT_MS = 120000;

  // Track if we're currently processing to prevent history reload during active session
  const isProcessingRef = useRef(false);
  const lastLoadedConversationRef = useRef<{ id: string; count: number } | null>(null);

  // Load messages from activeConversation when it changes (but not during active processing)
  useEffect(() => {
    if (isProcessingRef.current || state.status !== 'idle') {
      return;
    }

    if (activeConversation?.messages) {
      if (
        lastLoadedConversationRef.current?.id === activeConversation.id &&
        lastLoadedConversationRef.current?.count === activeConversation.messages.length
      ) {
        return;
      }

      const agentMessages: AgentMessage[] = activeConversation.messages.map((msg) => {
        const baseMessage = {
          id: String(msg.id),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
        };

        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const messages: AgentMessage[] = [];
          
          msg.toolCalls.forEach((tc) => {
            // 1. If there's preceding text attached to this tool call, add it as a separate assistant message
            if (tc.precedingText) {
              messages.push({
                id: `pre-tool-${tc.id}`,
                role: 'assistant',
                content: tc.precedingText,
                timestamp: new Date(msg.createdAt).getTime(),
              });
            }

            // 2. Add the tool call message itself
            messages.push({
              id: `tool-${tc.id}`,
              role: 'tool' as const,
              content: '',
              timestamp: new Date(msg.createdAt).getTime(),
              toolCall: {
                id: tc.id,
                name: tc.tool,
                input: tc.input,
                output: tc.output || undefined,
                status: tc.status as 'running' | 'completed' | 'error',
                durationMs: tc.durationMs || undefined,
                // precedingText is consumed above, no need to pass it to UI component if it doesn't use it
              },
            });
          });

          // 3. Add the final assistant response (if any)
          if (msg.content) {
            messages.push(baseMessage);
          }

          return messages;
        }

        return [baseMessage];
      }).flat();

      dispatch({ type: 'LOAD_HISTORY', messages: agentMessages });
      lastLoadedConversationRef.current = {
        id: activeConversation.id,
        count: activeConversation.messages.length,
      };
      isFirstMessageRef.current = activeConversation.messages.length === 0;
      conversationIdRef.current = activeConversation.id;
    } else if (!activeConversationId) {
      dispatch({ type: 'LOAD_HISTORY', messages: [] });
      lastLoadedConversationRef.current = null;
      isFirstMessageRef.current = true;
      conversationIdRef.current = null;
    }
  }, [activeConversation, activeConversationId, state.status]);

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

  // Extract conversation history from messages (last 10 complete rounds for 20-message window)
  const extractHistory = useCallback((messages: AgentMessage[]): ConversationTurn[] => {
    const history: ConversationTurn[] = [];

    let i = 0;
    while (i < messages.length) {
      if (messages[i].role === 'user') {
        const userPrompt = messages[i].content;

        let j = i + 1;
        let assistantResponse = '';

        while (j < messages.length && messages[j].role !== 'user') {
          if (messages[j].role === 'assistant' && messages[j].content) {
            assistantResponse += (assistantResponse ? '\n' : '') + messages[j].content;
          }
          j++;
        }

        if (userPrompt && assistantResponse) {
          history.push({
            user_prompt: userPrompt,
            assistant_response: assistantResponse,
          });
        }

        i = j;
      } else {
        i++;
      }
    }

    return history.slice(-10);
  }, []);

  // Use refs to avoid dependency issues with callbacks
  const stateRef = useRef(state);
  const extractHistoryRef = useRef(extractHistory);
  
  // Update refs in useEffect to avoid accessing during render
  useEffect(() => {
    stateRef.current = state;
    extractHistoryRef.current = extractHistory;
  });

  // Helper to save message to backend
  const saveMessageToBackend = useCallback(async (
    convId: string,
    role: 'user' | 'assistant',
    content: string,
    toolCalls?: ToolCallData[] | null
  ) => {
    try {
      const savedMessage = await conversationApi.addMessage(convId, {
        role,
        content,
        toolCalls,
      });
      addMessageToContext(savedMessage);
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  }, [addMessageToContext]);

  // Send message
  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || !dbName || stateRef.current.status !== 'idle') return;
      if (!connectionId) return;

      // Mark as processing to prevent history reload
      isProcessingRef.current = true;

      // Ensure we have a conversation
      let convId = activeConversationId;
      let shouldGenerateTitle = false;
      
      if (!convId) {
        try {
          const newConv = await createConversation(connectionId);
          convId = newConv.id;
          conversationIdRef.current = convId;
          shouldGenerateTitle = true;
        } catch (err) {
          console.error('Failed to create conversation:', err);
          dispatch({ type: 'SET_ERROR', error: 'Failed to create conversation' });
          return;
        }
      } else {
        conversationIdRef.current = convId;
        shouldGenerateTitle = !activeConversation?.messages?.length;
      }

      const trimmedPrompt = prompt.trim();
      
      // Save user message to backend
      await saveMessageToBackend(convId, 'user', trimmedPrompt);

      // Extract history BEFORE dispatching START (which adds the new user message)
      const history = extractHistoryRef.current(stateRef.current.messages);

      dispatch({ type: 'START', prompt: trimmedPrompt });

      // Accumulate assistant response for saving
      let accumulatedResponse = '';
      let accumulatedToolCalls: ToolCallData[] = [];
      // Track if we received text_delta events (streaming) to avoid duplicate message accumulation
      let receivedTextDelta = false;
      // Track the text that came before the current tool call
      let currentPrecedingText = '';

      const handlers = {
        onThinking: (data: ThinkingEventData) => {
          dispatch({ type: 'SET_THINKING', message: data.message, status: data.status });
        },
        onTextDelta: (data: { text: string }) => {
          dispatch({ type: 'TEXT_DELTA', text: data.text });
          accumulatedResponse += data.text;
          receivedTextDelta = true;
        },
        onToolCall: (data: ToolCallEventData) => {
          // If starting a new tool call, capture the accumulated text as preceding text for this tool
          if (data.status === 'running') {
            if (accumulatedResponse.trim()) {
              currentPrecedingText = accumulatedResponse;
              accumulatedResponse = ''; // Reset for next segment (e.g. final response)
            }
          }
          
          dispatch({ type: 'UPDATE_TOOL_CALL', data });
          if (data.status === 'completed' || data.status === 'error') {
            const toolCall: ToolCallData = {
              id: data.id,
              tool: data.tool,
              input: data.input || {},
              status: data.status,
              output: data.output || null,
              durationMs: data.durationMs || null,
              precedingText: currentPrecedingText || undefined,
            };
            // Reset preceding text after attaching it to a tool call
            currentPrecedingText = '';
            
            const existingIdx = accumulatedToolCalls.findIndex(tc => tc.id === data.id);
            if (existingIdx >= 0) {
              accumulatedToolCalls[existingIdx] = toolCall;
            } else {
              accumulatedToolCalls.push(toolCall);
            }
          }
        },
        onMessage: (data: MessageEventData) => {
          // Only add message and accumulate if we didn't receive text_delta (streaming)
          // This prevents duplicate content when streaming is used
          if (!receivedTextDelta) {
            dispatch({
              type: 'ADD_MESSAGE',
              message: {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.content,
                timestamp: Date.now(),
              },
            });
            accumulatedResponse += (accumulatedResponse ? '\n' : '') + data.content;
          }
          // If we received text_delta, the content is already accumulated via streaming
        },
        onSQL: (data: SQLEventData) => {
          dispatch({ type: 'SET_SQL', sql: data.sql, explanation: data.explanation });
          // Only add SQL content if not already streamed
          if (!receivedTextDelta) {
            const sqlContent = `Generated SQL:\n\`\`\`sql\n${data.sql}\n\`\`\`\n\n${data.explanation || ''}`;
            accumulatedResponse += (accumulatedResponse ? '\n' : '') + sqlContent;
          }
        },
        onError: (data: ErrorEventData) => {
          const error = data.error + (data.detail ? `: ${data.detail}` : '');
          dispatch({ type: 'SET_ERROR', error });
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        },
        onDone: async (_data: DoneEventData) => {
          // Flush any remaining streaming text to messages before completing
          dispatch({ type: 'FLUSH_STREAMING' });
          dispatch({ type: 'DONE' });
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          if (conversationIdRef.current) {
            // Save final message with tool calls (containing precedingText) and remaining response
            if (accumulatedResponse.trim() || accumulatedToolCalls.length > 0) {
              await saveMessageToBackend(
                conversationIdRef.current,
                'assistant',
                accumulatedResponse, // This is the final text AFTER the last tool call
                accumulatedToolCalls.length > 0 ? accumulatedToolCalls : null
              );
            }

            if (shouldGenerateTitle) {
              generateTitle(conversationIdRef.current, trimmedPrompt).catch(err => {
                console.error('Failed to generate title:', err);
              });
            }
          }

          isProcessingRef.current = false;
          setTimeout(() => dispatch({ type: 'RESET' }), 500);
        },
      };

      abortControllerRef.current = apiClient.agentQuery(
        dbName,
        { prompt: trimmedPrompt, history },
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
    [dbName, connectionId, activeConversationId, activeConversation, createConversation, saveMessageToBackend, generateTitle]
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


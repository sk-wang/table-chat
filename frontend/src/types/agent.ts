// === Agent Message Types ===

export type AgentMessageRole = 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  timestamp: number;
  toolCall?: ToolCallInfo;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
}

// === SSE Event Types ===

export type AgentEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'message'
  | 'sql'
  | 'error'
  | 'done';

export interface ThinkingEventData {
  status: 'analyzing' | 'planning' | 'generating';
  message: string;
}

export interface ToolCallEventData {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  output?: string;
  durationMs?: number;
}

export interface MessageEventData {
  role: 'assistant';
  content: string;
}

export interface SQLEventData {
  sql: string;
  explanation?: string;
}

export interface ErrorEventData {
  error: string;
  detail?: string;
}

export interface DoneEventData {
  totalTimeMs: number;
  toolCallsCount: number;
}

// === Component State Types ===

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'tool_running'
  | 'responding'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface AgentState {
  status: AgentStatus;
  messages: AgentMessage[];
  generatedSQL?: string;
  explanation?: string;
  error?: string;
  totalTimeMs?: number;
}

// === API Types ===

export interface AgentQueryRequest {
  prompt: string;
}

export interface AgentStatusResponse {
  available: boolean;
  configured: boolean;
  model?: string;
}

// === SSE Event Handler Types ===

export interface AgentEventHandlers {
  onThinking?: (data: ThinkingEventData) => void;
  onToolCall?: (data: ToolCallEventData) => void;
  onMessage?: (data: MessageEventData) => void;
  onSQL?: (data: SQLEventData) => void;
  onError?: (data: ErrorEventData) => void;
  onDone?: (data: DoneEventData) => void;
}


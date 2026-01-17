export interface Conversation {
  id: string;
  connectionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCallData[] | null;
  createdAt: string;
}

export interface ToolCallData {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  output: string | null;
  durationMs: number | null;
  precedingText?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface UpdateConversationRequest {
  title: string;
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallData[] | null;
}

export interface GenerateTitleRequest {
  firstMessage: string;
}

export interface GenerateTitleResponse {
  title: string;
}

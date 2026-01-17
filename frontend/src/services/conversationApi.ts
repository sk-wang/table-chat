import type {
  Conversation,
  ConversationListResponse,
  ConversationWithMessages,
  CreateConversationRequest,
  CreateMessageRequest,
  GenerateTitleRequest,
  GenerateTitleResponse,
  Message,
  UpdateConversationRequest,
} from '../types/conversation';

const API_BASE = '/api/v1';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function listConversations(
  connectionId: string,
  limit = 50
): Promise<ConversationListResponse> {
  const response = await fetch(
    `${API_BASE}/dbs/${encodeURIComponent(connectionId)}/conversations?limit=${limit}`
  );
  return handleResponse<ConversationListResponse>(response);
}

export async function createConversation(
  connectionId: string,
  data?: CreateConversationRequest
): Promise<Conversation> {
  const response = await fetch(
    `${API_BASE}/dbs/${encodeURIComponent(connectionId)}/conversations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    }
  );
  return handleResponse<Conversation>(response);
}

export async function getConversation(
  conversationId: string,
  messageLimit = 100
): Promise<ConversationWithMessages> {
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}?messageLimit=${messageLimit}`
  );
  return handleResponse<ConversationWithMessages>(response);
}

export async function updateConversation(
  conversationId: string,
  data: UpdateConversationRequest
): Promise<Conversation> {
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<Conversation>(response);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
}

export async function addMessage(
  conversationId: string,
  data: CreateMessageRequest
): Promise<Message> {
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<Message>(response);
}

export async function generateTitle(
  conversationId: string,
  data: GenerateTitleRequest
): Promise<GenerateTitleResponse> {
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/generate-title`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<GenerateTitleResponse>(response);
}

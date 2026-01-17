import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Conversation, ConversationWithMessages, Message } from '../types/conversation';
import * as conversationApi from '../services/conversationApi';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: ConversationWithMessages | null;
  loading: boolean;
  error: string | null;
}

type ConversationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: ConversationWithMessages | null }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'DELETE_CONVERSATION'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_ACTIVE_ID'; payload: string | null };

const initialState: ConversationState = {
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  loading: false,
  error: null,
};

function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_ACTIVE_CONVERSATION':
      return {
        ...state,
        activeConversation: action.payload,
        activeConversationId: action.payload?.id ?? null,
      };
    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
        activeConversation:
          state.activeConversation?.id === action.payload.id
            ? { ...state.activeConversation, ...action.payload }
            : state.activeConversation,
      };
    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.payload),
        activeConversation:
          state.activeConversation?.id === action.payload ? null : state.activeConversation,
        activeConversationId:
          state.activeConversationId === action.payload ? null : state.activeConversationId,
      };
    case 'ADD_MESSAGE':
      if (!state.activeConversation || state.activeConversation.id !== action.payload.conversationId) {
        return state;
      }
      return {
        ...state,
        activeConversation: {
          ...state.activeConversation,
          messages: [...state.activeConversation.messages, action.payload],
        },
      };
    case 'SET_ACTIVE_ID':
      return { ...state, activeConversationId: action.payload };
    default:
      return state;
  }
}

interface ConversationContextValue extends ConversationState {
  loadConversations: (connectionId: string) => Promise<void>;
  createConversation: (connectionId: string, title?: string) => Promise<Conversation>;
  switchConversation: (conversationId: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  generateTitle: (conversationId: string, firstMessage: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const loadConversations = useCallback(async (connectionId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await conversationApi.listConversations(connectionId);
      dispatch({ type: 'SET_CONVERSATIONS', payload: response.items });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to load conversations' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createConversation = useCallback(async (connectionId: string, title?: string) => {
    const conversation = await conversationApi.createConversation(connectionId, { title });
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    dispatch({
      type: 'SET_ACTIVE_CONVERSATION',
      payload: { ...conversation, messages: [] },
    });
    return conversation;
  }, []);

  const switchConversation = useCallback(async (conversationId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const conversation = await conversationApi.getConversation(conversationId);
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to load conversation' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    const updated = await conversationApi.updateConversation(conversationId, { title });
    dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
  }, []);

  const deleteConversationHandler = useCallback(async (conversationId: string) => {
    await conversationApi.deleteConversation(conversationId);
    dispatch({ type: 'DELETE_CONVERSATION', payload: conversationId });
  }, []);

  const addMessage = useCallback((message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const generateTitle = useCallback(async (conversationId: string, firstMessage: string) => {
    try {
      await conversationApi.generateTitle(conversationId, { firstMessage });
      const updated = await conversationApi.getConversation(conversationId);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
    } catch (err) {
      console.error('Failed to generate title:', err);
    }
  }, []);

  const value: ConversationContextValue = {
    ...state,
    loadConversations,
    createConversation,
    switchConversation,
    updateConversationTitle,
    deleteConversation: deleteConversationHandler,
    addMessage,
    generateTitle,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}

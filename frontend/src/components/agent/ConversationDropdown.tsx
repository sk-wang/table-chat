import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Input, Spin, Empty, Popconfirm } from 'antd';
import type { InputRef } from 'antd';
import {
  SearchOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useConversation } from '../../contexts/ConversationContext';
import type { Conversation } from '../../types/conversation';

interface ConversationDropdownProps {
  connectionId: string;
  visible: boolean;
  onClose: () => void;
}

interface GroupedConversations {
  label: string;
  conversations: Conversation[];
}

function groupConversationsByDate(conversations: Conversation[]): GroupedConversations[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const groups: { [key: string]: Conversation[] } = {
    today: [],
    yesterday: [],
  };
  const monthGroups: { [key: string]: Conversation[] } = {};

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    const convDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (convDate.getTime() >= today.getTime()) {
      groups.today.push(conv);
    } else if (convDate.getTime() >= yesterday.getTime()) {
      groups.yesterday.push(conv);
    } else {
      const monthsDiff =
        (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
      const key = monthsDiff <= 0 ? '1mo' : `${monthsDiff}mo`;
      if (!monthGroups[key]) {
        monthGroups[key] = [];
      }
      monthGroups[key].push(conv);
    }
  });

  const result: GroupedConversations[] = [];

  if (groups.today.length > 0) {
    result.push({ label: 'Today', conversations: groups.today });
  }
  if (groups.yesterday.length > 0) {
    result.push({ label: 'Yesterday', conversations: groups.yesterday });
  }

  const sortedMonthKeys = Object.keys(monthGroups).sort((a, b) => {
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    return aNum - bNum;
  });

  sortedMonthKeys.forEach((key) => {
    result.push({ label: `${key} ago`, conversations: monthGroups[key] });
  });

  return result;
}

export function ConversationDropdown({
  connectionId,
  visible,
  onClose,
}: ConversationDropdownProps) {
  const {
    conversations,
    activeConversationId,
    loading,
    loadConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
  } = useConversation();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const deleteInProgressRef = useRef(false);
  const searchInputRef = useRef<InputRef>(null);
  const editInputRef = useRef<InputRef>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && connectionId) {
      loadConversations(connectionId);
    }
  }, [visible, connectionId, loadConversations]);

  useEffect(() => {
    if (visible && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [visible]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (deleteInProgressRef.current) return;
      const target = e.target as Element;
      if (dropdownRef.current && dropdownRef.current.contains(target as Node)) {
        return;
      }
      const eventPath = e.composedPath?.() ?? [];
      const isInsidePopover = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return (
          node.classList.contains('ant-popover') ||
          node.classList.contains('ant-popconfirm') ||
          node.classList.contains('ant-popover-content') ||
          node.classList.contains('ant-popover-inner') ||
          node.classList.contains('ant-popover-buttons') ||
          node.classList.contains('ant-popover-inner-content')
        );
      });
      if (target.closest('.ant-popconfirm, .ant-popover') || isInsidePopover) {
        return;
      }
      if (document.querySelector('.ant-popconfirm, .ant-popover')) {
        return;
      }
      onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => conv.title.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId !== activeConversationId) {
      await switchConversation(conversationId);
    }
    onClose();
  };

  const handleNewChat = async () => {
    await createConversation(connectionId);
    onClose();
  };

  const handleStartEdit = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null);
      return;
    }

    const conv = conversations.find((c) => c.id === editingId);
    if (conv && editTitle.trim() !== conv.title) {
      setIsSaving(true);
      try {
        await updateConversationTitle(editingId, editTitle.trim());
      } finally {
        setIsSaving(false);
      }
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      await loadConversations(connectionId);
    } catch (error) {
      console.error('[ConversationDropdown] Delete failed:', error);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="conversation-dropdown"
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="conversation-dropdown-header">
        <span className="conversation-dropdown-title">Chat History</span>
        <CloseOutlined className="conversation-dropdown-close" onClick={onClose} />
      </div>

      <div className="conversation-dropdown-search">
        <Input
          ref={searchInputRef}
          placeholder="Search..."
          prefix={<SearchOutlined style={{ color: '#666' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          className="conversation-search-input"
        />
      </div>

      <div className="conversation-dropdown-list">
        {loading && conversations.length === 0 ? (
          <div className="conversation-dropdown-loading">
            <Spin size="small" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchQuery ? 'No matching chats' : 'No chats yet'}
            className="conversation-dropdown-empty"
          />
        ) : (
          groupedConversations.map((group) => (
            <div key={group.label} className="conversation-group">
              <div className="conversation-group-label">{group.label}</div>
              {group.conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`conversation-dropdown-item ${isActive ? 'active' : ''}`}
                    onClick={() => !isEditing && handleSelectConversation(conv.id)}
                  >
                    <MessageOutlined className="conversation-item-icon" />

                    {isEditing ? (
                      <Input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleEditKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        className="conversation-edit-input"
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="conversation-item-title">{conv.title}</span>
                    )}

                    {isActive && !isEditing && (
                      <span className="conversation-item-current">Current</span>
                    )}

                    {!isEditing && (
                      <div className="conversation-item-actions">
                        <EditOutlined
                          className="conversation-action-icon"
                          onClick={(e) => handleStartEdit(e, conv)}
                        />
                        <Popconfirm
                          title="Delete this chat?"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDelete(conv.id);
                          }}
                          onCancel={(e) => {
                            e?.stopPropagation();
                            deleteInProgressRef.current = false;
                          }}
                          onOpenChange={(open) => {
                            if (open) {
                              deleteInProgressRef.current = true;
                              return;
                            }
                            setTimeout(() => {
                              deleteInProgressRef.current = false;
                            }, 200);
                          }}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <DeleteOutlined
                            className="conversation-action-icon delete"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="conversation-dropdown-footer">
        <button className="conversation-new-chat-btn" onClick={handleNewChat} disabled={loading}>
          + New Chat
        </button>
      </div>
    </div>
  );
}

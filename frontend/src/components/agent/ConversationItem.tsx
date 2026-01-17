import React, { useState, useRef, useEffect } from 'react';
import { Popconfirm, Input } from 'antd';
import type { InputRef } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { Conversation } from '../../types/conversation';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete?: (conversationId: string) => Promise<void>;
  onRename?: (conversationId: string, newTitle: string) => Promise<void>;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  onDelete,
  onRename,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!onRename || !editTitle.trim() || editTitle.trim() === conversation.title) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onRename(conversation.id, editTitle.trim());
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(conversation.id);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={isEditing ? undefined : onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        cursor: isEditing ? 'default' : 'pointer',
        backgroundColor: isActive ? '#e6f4ff' : (isHovered ? '#fafafa' : 'transparent'),
        border: isActive ? '1px solid #91caff' : '1px solid transparent',
        transition: 'all 0.2s',
        marginBottom: 4,
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            size="small"
            style={{ flex: 1, marginRight: 8 }}
            disabled={isSaving}
          />
        ) : (
          <div
            style={{
              fontSize: 14,
              fontWeight: isActive ? 500 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#333',
              flex: 1,
              marginRight: isHovered && (onDelete || onRename) ? 48 : 0,
            }}
          >
            {conversation.title}
          </div>
        )}
        {isHovered && !isEditing && (onRename || onDelete) && (
          <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', gap: 4 }}>
            {onRename && (
              <EditOutlined
                onClick={handleStartEdit}
                style={{
                  color: '#999',
                  fontSize: 14,
                  padding: 4,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
              />
            )}
            {onDelete && (
              <Popconfirm
                title="Delete conversation"
                description="Are you sure you want to delete this conversation?"
                onConfirm={handleDelete}
                onCancel={(e) => e?.stopPropagation()}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: isDeleting }}
              >
                <DeleteOutlined
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: '#999',
                    fontSize: 14,
                    padding: 4,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4f')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
                />
              </Popconfirm>
            )}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#999',
          marginTop: 2,
        }}
      >
        {formatDate(conversation.updatedAt)}
      </div>
    </div>
  );
};

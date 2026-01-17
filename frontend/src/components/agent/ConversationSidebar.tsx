import { useEffect } from 'react';
import { Button, Spin, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useConversation } from '../../contexts/ConversationContext';
import { ConversationItem } from './ConversationItem';

interface ConversationSidebarProps {
  connectionId: string;
  collapsed?: boolean;
}

export function ConversationSidebar({ 
  connectionId, 
  collapsed = false,
}: ConversationSidebarProps) {
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

  useEffect(() => {
    if (connectionId) {
      loadConversations(connectionId);
    }
  }, [connectionId, loadConversations]);

  const handleNewConversation = async () => {
    await createConversation(connectionId);
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId !== activeConversationId) {
      await switchConversation(conversationId);
    }
  };

  if (collapsed) {
    return null;
  }

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        height: '100%',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        overflow: 'auto',
        backgroundColor: 'rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewConversation}
          loading={loading}
          block
          size="small"
          style={{ marginBottom: 12 }}
        >
          New Chat
        </Button>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading && conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" />
            </div>
          ) : conversations.length === 0 ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description="No conversations"
              style={{ margin: '20px 0' }}
            />
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onClick={() => handleSelectConversation(conv.id)}
                 onDelete={async (id: string) => {
                   await deleteConversation(id);
                   await loadConversations(connectionId);
                 }}
                onRename={updateConversationTitle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

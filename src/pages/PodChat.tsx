import { useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePodsStore } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export default function PodChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, evmAddress } = useWalletStore();
  const { 
    getPodById, 
    messages, 
    isLoadingMessages, 
    isSending, 
    fetchMessages, 
    fetchPods, 
    sendMessage,
    isUserMember 
  } = usePodsStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const podId = id ? Number(id) : null;
  const pod = podId ? getPodById(podId) : null;
  const podMessages = podId ? (messages[podId] || []) : [];

  // Fetch initial data
  useEffect(() => {
    if (!podId) return;
    
    fetchMessages(podId);
    if (!pod) {
      fetchPods();
    }
  }, [podId, fetchMessages, fetchPods, pod]);

  // Polling for new messages
  useEffect(() => {
    if (!podId) return;
    
    const interval = setInterval(() => {
      fetchMessages(podId);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [podId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [podMessages]);

  const handleSend = async (content: string) => {
    if (!podId) return;
    await sendMessage(podId, content);
  };

  // Check if user is at bottom for auto-scroll decisions
  const isAtBottom = () => {
    if (!messagesContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  // Render messages with consecutive sender collapse
  const renderMessages = () => {
    const sortedMessages = [...podMessages].sort((a, b) => a.timestamp - b.timestamp);
    
    return sortedMessages.map((message, index) => {
      const prevMessage = sortedMessages[index - 1];
      const showSender = !prevMessage || 
        prevMessage.sender !== message.sender || 
        (message.timestamp - prevMessage.timestamp) > 5 * 60 * 1000; // 5 minutes
      
      const isMine = message.sender === evmAddress;
      
      return (
        <MessageBubble
          key={message.id}
          sender={message.sender}
          content={message.content}
          timestamp={message.timestamp}
          isMine={isMine}
          showSender={showSender}
        />
      );
    });
  };

  if (!podId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid pod ID</p>
        <Link to="/explore" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Back to Explore →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-border-subtle shrink-0">
        {/* Back button on mobile */}
        <Button 
          variant="icon" 
          onClick={() => navigate('/explore')}
          className="md:hidden"
        >
          ←
        </Button>
        
        {/* Pod name */}
        <h2 className="text-h3 font-sans font-semibold text-text-primary">
          {pod?.name || `Pod ${podId}`}
        </h2>
        
        {/* Member count */}
        <div className="ml-auto text-caption text-text-tertiary">
          {pod?.memberCount || 0} members
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
      >
        {isLoadingMessages[podId] ? (
          // Loading skeletons
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} mt-4`}>
                <div className="max-w-[75%] md:max-w-[85%]">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-8 w-48" />
                </div>
              </div>
            ))}
          </>
        ) : podMessages.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full">
            <p className="text-body-sm text-text-tertiary text-center">
              No messages yet. Start the conversation
            </p>
          </div>
        ) : (
          // Messages
          <>
            {renderMessages()}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat input or connect prompt */}
      {!isConnected ? (
        <div className="px-6 py-4 border-t border-border-subtle text-center">
          <Link to="/connect" className="text-label text-cyan-primary hover:text-cyan-hover">
            Connect wallet to chat →
          </Link>
        </div>
      ) : !isUserMember(podId) ? (
        <div className="px-6 py-3 bg-surface-2 border-t border-border-subtle text-center">
          <p className="text-body-sm text-text-secondary mb-2">
            Join this pod to send messages
          </p>
          <Link to="/explore" className="text-label text-cyan-primary hover:text-cyan-hover">
            Back to Explore →
          </Link>
        </div>
      ) : (
        <ChatInput
          placeholder={`Message ${pod?.name || 'pod'}...`}
          onSend={handleSend}
          disabled={!isConnected}
          isSending={isSending}
        />
      )}
    </div>
  );
}

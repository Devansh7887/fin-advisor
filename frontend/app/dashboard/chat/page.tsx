'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { chatAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { io, Socket } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  _id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export default function ChatPage() {
  const { token, user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeChat();

    // Connect to WebSocket
    socketRef.current = io('http://localhost:3001/chat', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket connected to chat');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    socketRef.current.on('chat:message:user', (data: any) => {
      console.log('📤 User message confirmed:', data);
      setMessages((prev) => [...prev, { role: 'user', content: data.message, timestamp: new Date() }]);
      setStreamingMessage('');
    });

    socketRef.current.on('chat:message:stream', (data: any) => {
      console.log('📨 Streaming chunk received:', data.chunk);
      setStreamingMessage((prev) => prev + data.chunk);
    });

    socketRef.current.on('chat:message:complete', (data: any) => {
      console.log('✅ Complete message received:', data);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }]);
      setStreamingMessage('');
      setIsLoading(false);
    });

    socketRef.current.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      setIsLoading(false);
      alert('Connection error. Please refresh the page.');
    });

    socketRef.current.on('chat:error', (data: any) => {
      console.error('❌ Chat error:', data.error);
      setIsLoading(false);
      alert(`Error: ${data.error}`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const initializeChat = async () => {
    try {
      const response = await chatAPI.getConversations();
      const data = response.data;
      setConversations(data);
      
      // Auto-create new conversation if none exist
      if (data.length === 0) {
        console.log('No conversations found, creating new one...');
        await createNewConversation();
      } else {
        // Auto-select first conversation
        setSelectedConversation(data[0]._id);
        setMessages(data[0].messages);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // If error, try to create a new conversation
      await createNewConversation();
    } finally {
      setIsInitializing(false);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      const data = response.data;
      setConversations(data);
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]._id);
        setMessages(data[0].messages);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await chatAPI.createConversation({ title: 'New Conversation' });
      const newConv = response.data;
      setConversations([newConv, ...conversations]);
      setSelectedConversation(newConv._id);
      setMessages([]);
      console.log('✅ New conversation created:', newConv._id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async () => {
    if ((!inputMessage.trim() && attachedFiles.length === 0) || !selectedConversation || isLoading) return;

    let messageText = inputMessage;
    if (attachedFiles.length > 0) {
      messageText += `\n\n📎 Attached ${attachedFiles.length} file(s): ${attachedFiles.map(f => f.name).join(', ')}`;
    }
    
    const userId = user?.id;
    
    if (!userId) {
      console.error('❌ No user ID found');
      alert('Please log in again');
      return;
    }

    setInputMessage('');
    setAttachedFiles([]);
    setIsLoading(true);

    // Set timeout to reset loading state after 30 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      console.error('⏱️ Response timeout');
      setIsLoading(false);
      setStreamingMessage('');
      alert('Response timeout. Please try again.');
    }, 30000);

    console.log('📤 Sending message:', messageText);
    console.log('📋 Conversation ID:', selectedConversation);
    console.log('👤 User ID:', userId);

    try {
      // Use WebSocket for streaming response
      if (socketRef.current?.connected) {
        socketRef.current.emit('chat:message', {
          conversationId: selectedConversation,
          message: messageText,
          userId: userId,
        });
        console.log('✅ Message emitted via WebSocket');
      } else {
        console.error('❌ WebSocket not connected, trying to reconnect...');
        socketRef.current?.connect();
        
        // Fallback to HTTP API
        setTimeout(async () => {
          try {
            const response = await chatAPI.sendMessage(selectedConversation, { message: messageText });
            setMessages([...messages, 
              { role: 'user', content: messageText, timestamp: new Date() },
              { role: 'assistant', content: response.data.response, timestamp: new Date() }
            ]);
            setIsLoading(false);
          } catch (err) {
            console.error('HTTP fallback failed:', err);
            alert('Failed to send message. Please try again.');
            setIsLoading(false);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      alert('Failed to send message. Please try again.');
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles([...attachedFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectConversation = async (convId: string) => {
    setSelectedConversation(convId);
    try {
      const response = await chatAPI.getConversation(convId);
      const conv = response.data;
      setMessages(conv.messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await chatAPI.deleteConversation(convId);
      setConversations(conversations.filter((c) => c._id !== convId));
      if (selectedConversation === convId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4">
      {isInitializing ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            <Button onClick={createNewConversation} className="w-full">
              + New Chat
            </Button>
            <Card className="flex-1 overflow-auto p-2">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={`p-3 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedConversation === conv._id ? 'bg-blue-50 border border-blue-300' : ''
                    }`}
                    onClick={() => selectConversation(conv._id)}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium truncate flex-1">{conv.title}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv._id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs ml-2"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className={`${msg.role === 'assistant' ? 'text-gray-900' : 'text-white'}`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-3 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-inherit" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-1" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline ? (
                              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props} />
                            ) : (
                              <code className="block bg-gray-200 p-2 rounded text-sm my-2" {...props} />
                            ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <p
                      className={`text-xs mt-2 ${
                        msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] p-4 rounded-lg bg-gray-100 text-gray-900">
                    <div className="text-gray-900">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-3 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-inherit" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-1" {...props} />,
                        }}
                      >
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              {/* Attached Files Preview */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-blue-100 px-3 py-2 rounded-lg text-sm">
                      <span className="text-blue-700">📎 {file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                {/* File Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  variant="outline"
                  className="px-3"
                  title="Attach files"
                >
                  📎
                </Button>
                
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about investments, market trends, portfolio advice..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isLoading || (!inputMessage.trim() && attachedFiles.length === 0)}>
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send • Shift+Enter for new line • 📎 to attach files
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Welcome to AI Financial Advisor</h3>
              <p>Select a conversation or create a new one to get started</p>
            </div>
          </div>
        )}
          </Card>
        </>
      )}
    </div>
  );
}

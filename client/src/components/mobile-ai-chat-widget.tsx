import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Mic, MicOff, Copy, MessageCircle, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LazyLoading } from './ui/lazy-loading';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import robotIcon from '/assets/robot-chat-bot-concept-illustration-vector_1752050227392.jpg';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: number;
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIChatWidget() {
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const storageKey = user ? `chatOpen_${user.id}` : 'chatOpen_guest';
      return localStorage.getItem(storageKey) === 'true';
    }
    return false;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const storageKey = user ? `chatMessages_${user.id}` : 'chatMessages_guest';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        } catch (e) {
          console.error('Error parsing saved messages:', e);
        }
      }
    }
    // Always start with static AI greeting message to avoid API wastage
    return [
      {
        id: 1,
        message: "Hello! I'm your SolarSense AI assistant ready to help with energy trading and optimization. Ask about energy flow, trading strategies, or grid management.",
        sender: 'ai',
        timestamp: new Date()
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [displayedText, setDisplayedText] = useState<{ [key: number]: string }>({});
  const [isTyping, setIsTyping] = useState(false);
  const [canStop, setCanStop] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save chat state to localStorage when it changes (user-specific)
  useEffect(() => {
    const storageKey = user ? `chatOpen_${user.id}` : 'chatOpen_guest';
    localStorage.setItem(storageKey, isOpen.toString());
  }, [isOpen, user]);

  // Save messages to localStorage when they change (user-specific)
  useEffect(() => {
    const storageKey = user ? `chatMessages_${user.id}` : 'chatMessages_guest';
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, user]);

  // Handle user login/logout for chat persistence
  useEffect(() => {
    if (user) {
      // User logged in - restore their chat history
      const userStorageKey = `chatMessages_${user.id}`;
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        try {
          const userMessages = JSON.parse(saved).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(userMessages);
        } catch (e) {
          console.error('Error loading user chat messages:', e);
        }
      }
    } else {
      // User logged out - reset to guest mode  
      setMessages([{
        id: 1,
        message: "Hello! I'm your AI assistant. How can I help you with solar panel analysis today?",
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  }, [user]);





  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Handle click outside to close widget (exclude icon button)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        widgetRef.current && 
        !widgetRef.current.contains(event.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Add touch detection for mobile scroll interruption
  useEffect(() => {
    const handleTouchStart = () => {
      if (typingMessageId) {
        // User started touching - disable auto-scroll immediately
        setUserInteracting(true);
        setAutoScroll(false);
        clearAutoScrollInterval();
      }
    };

    const handleWheel = (e: Event) => {
      if ((e as WheelEvent).deltaY < 0 && typingMessageId) {
        // User is scrolling up with mouse wheel - disable auto-scroll immediately
        setUserInteracting(true);
        setAutoScroll(false);
        clearAutoScrollInterval();
      }
    };

    if (scrollRef.current && isOpen) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        scrollElement.addEventListener('wheel', handleWheel, { passive: true });
        
        return () => {
          scrollElement.removeEventListener('touchstart', handleTouchStart);
          scrollElement.removeEventListener('wheel', handleWheel);
        };
      }
    }
  }, [isOpen, typingMessageId]);

  // Cleanup typing timeout and auto-scroll interval on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
        const scrollDifference = scrollTop - lastScrollTop;
        
        // More sensitive detection for upward scrolling
        if (scrollDifference < -2) {
          // User is scrolling up - disable auto-scroll immediately
          setUserInteracting(true);
          setAutoScroll(false);
          clearAutoScrollInterval();
        }
        
        // Re-enable auto-scroll when user scrolls back to bottom
        if (isNearBottom && !typingMessageId) {
          setAutoScroll(true);
          setUserInteracting(false);
        }
        
        setLastScrollTop(scrollTop);
      }
    }
  };

  // Enhanced auto-scroll when new messages are added or during typing
  useEffect(() => {
    if (autoScroll) {
      const timeoutId = setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, autoScroll, displayedText]);

  // Clear auto-scroll interval helper
  const clearAutoScrollInterval = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  // Auto-scroll during typing animation - simplified approach
  useEffect(() => {
    if (typingMessageId && autoScroll && !userInteracting) {
      // Clear any existing interval
      clearAutoScrollInterval();
      
      // Start new interval
      autoScrollIntervalRef.current = setInterval(() => {
        // Only scroll if conditions are still met
        if (autoScroll && !userInteracting && typingMessageId) {
          scrollToBottom(true);
        } else {
          clearAutoScrollInterval();
        }
      }, 100); // Reasonable interval
      
      return () => clearAutoScrollInterval();
    } else {
      clearAutoScrollInterval();
    }
  }, [typingMessageId, autoScroll, userInteracting]);

  // Reset auto-scroll when typing starts (new AI message)
  useEffect(() => {
    if (typingMessageId) {
      // Always reset auto-scroll for new AI messages
      setAutoScroll(true);
      setUserInteracting(false);
      setLastScrollTop(0);
    }
  }, [typingMessageId]);

  // Stop typing animation
  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingMessageId(null);
    setIsTyping(false);
    setCanStop(false);
  };

  // Typing animation effect
  const startTypingAnimation = (messageId: number, fullText: string) => {
    setTypingMessageId(messageId);
    setIsTyping(true);
    setCanStop(true);
    setDisplayedText(prev => ({ ...prev, [messageId]: '' }));
    
    // Reset auto-scroll state for this typing animation
    setAutoScroll(true);
    setUserInteracting(false);
    
    let index = 0;
    const typeNextCharacter = () => {
      if (index < fullText.length) {
        setDisplayedText(prev => ({
          ...prev,
          [messageId]: fullText.substring(0, index + 1)
        }));
        index++;
        typingTimeoutRef.current = setTimeout(typeNextCharacter, 8); // Slower typing so user can stop
      } else {
        setTypingMessageId(null);
        setIsTyping(false);
        setCanStop(false);
      }
    };
    
    typeNextCharacter();
  };

  const copyToClipboard = (text: string, messageId: number) => {
    // Remove markdown formatting for cleaner copy
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1') // Bold
                         .replace(/\*(.*?)\*/g, '$1')     // Italic
                         .replace(/`(.*?)`/g, '$1')       // Inline code
                         .replace(/^#+\s/gm, '')         // Headers
                         .replace(/^\-\s/gm, '• ');      // List items
    
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = cleanText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      message: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/ai/chat', { message: inputValue });
      const data = await response.json();
      
      // Handle both JSON responses and error responses
      let aiResponseText = "";
      if (data.error) {
        if (data.error.includes('503') || data.error.includes('overloaded') || data.error.includes('UNAVAILABLE')) {
          aiResponseText = "I'm currently experiencing high demand. Please wait a moment and try again. The AI service is temporarily overloaded.";
        } else {
          aiResponseText = `I apologize, but I'm experiencing some technical difficulties: ${data.error}`;
        }
      } else if (typeof data === 'string') {
        try {
          const jsonData = JSON.parse(data);
          aiResponseText = jsonData.response || data;
        } catch {
          aiResponseText = data;
        }
      } else {
        aiResponseText = data.response || data.message || "I'm sorry, I couldn't process your request right now.";
      }
      
      const aiMessage: ChatMessage = {
        id: messages.length + 2,
        message: aiResponseText,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Reset auto-scroll state for new AI message
      setAutoScroll(true);
      setUserInteracting(false);
      
      // Start typing animation for AI response
      startTypingAnimation(aiMessage.id, aiResponseText);
    } catch (error) {
      console.error('AI Chat error:', error);
      let errorText = "I'm experiencing connection issues. Please check your internet connection and try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('503') || error.message.includes('overloaded')) {
          errorText = "The AI service is currently experiencing high demand. Please wait a few minutes and try again.";
        } else if (error.message.includes('timeout')) {
          errorText = "The request timed out. Please try again with a shorter message.";
        } else if (error.message.includes('network')) {
          errorText = "Network connection failed. Please check your internet connection and try again.";
        }
      }
      
      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        message: errorText,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Reset auto-scroll state for error message
      setAutoScroll(true);
      setUserInteracting(false);
      
      // Start typing animation for error message
      startTypingAnimation(errorMessage.id, errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Only clear localStorage state, keep chat messages
    localStorage.removeItem('chatOpen');
  };

  const startNewConversation = () => {
    // Clear chat data and reset conversation
    localStorage.removeItem('chatMessages');
    
    // Reset to initial state with AI greeting message
    const greetingMessage = {
      id: 1,
      message: "Hello! I'm your AI assistant. How can I help you with solar panel analysis today?",
      sender: 'ai' as const,
      timestamp: new Date()
    };
    
    setMessages([greetingMessage]);
    setInputValue('');
    setTypingMessageId(null);
    setIsTyping(false);
    setDisplayedText({});
    // Keep widget open, don't close it
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Always show the chat icon */}
      <button
        ref={iconRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full shadow-lg transition-all duration-300 border-2 border-white cursor-pointer hover:scale-105 touch-manipulation"
        aria-label={isOpen ? "Close AI Chat" : "Open AI Chat"}
      >
        <img 
          src={robotIcon} 
          alt="AI Robot" 
          className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full object-cover"
        />
      </button>
      
      {/* Chat widget positioned above the icon */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2" ref={widgetRef}>
          <Card className={`w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg transition-all duration-300 h-[60vh] sm:h-[70vh] max-h-80 sm:max-h-96 md:max-h-[500px] shadow-2xl drop-shadow-lg rounded-lg`}>
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="text-sm sm:text-base font-medium flex items-center">
            <img 
              src={robotIcon} 
              alt="AI Robot" 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover mr-2"
            />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-3 sm:gap-4">
            {/* New Conversation Button - Always show when chat is open */}
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              className="h-7 w-auto px-2 sm:h-8 sm:px-3 hover:bg-white/20 text-xs rounded-md"
              title="Start new conversation"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="text-[10px] sm:text-xs font-medium">New Chat</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-white/20"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardHeader>
        

          <CardContent className="p-0 flex flex-col h-[calc(100%-3rem)]">
            {/* Chat Messages Area - Positioned directly above input */}
            <ScrollArea ref={scrollRef} className="flex-1 p-3 sm:p-4 pb-0" onScroll={handleScroll}>
              <div className="space-y-3 sm:space-y-4 pb-3 sm:pb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                      <div
                        className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm sm:text-base ${
                          msg.sender === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {msg.sender === 'ai' ? (
                          <div>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 list-disc">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 list-decimal">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children, className }) => {
                                  const isInline = !className?.includes('language-');
                                  return isInline ? (
                                    <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
                                      {children}
                                    </code>
                                  ) : (
                                    <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto mb-2">
                                      <code>{children}</code>
                                    </pre>
                                  );
                                },
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-purple-500 pl-3 italic mb-2">
                                    {children}
                                  </blockquote>
                                ),
                                hr: () => <hr className="my-2 border-gray-300" />
                              }}
                            >
                              {typingMessageId === msg.id ? displayedText[msg.id] || '' : msg.message}
                            </ReactMarkdown>
                            {typingMessageId === msg.id && (
                              <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1 rounded-sm"></span>
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.message}</div>
                        )}
                      </div>
                      
                      {/* Copy button for AI messages (positioned at right lower corner) */}
                      {msg.sender === 'ai' && typingMessageId !== msg.id && (
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(msg.message, msg.id)}
                            className="h-6 w-6 p-0 hover:bg-gray-200 opacity-70 hover:opacity-100 transition-opacity rounded-md"
                            title={copiedMessageId === msg.id ? "Copied!" : "Copy message"}
                          >
                            <Copy className={`h-3 w-3 ${copiedMessageId === msg.id ? 'text-green-600' : 'text-gray-600'}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm sm:text-base">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-3 sm:p-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex items-center gap-3 sm:gap-4">
                <Input
                  type="text"
                  placeholder={isListening ? "Listening..." : "Ask about solar panels..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-sm sm:text-base h-9 sm:h-10"
                  disabled={isLoading || isListening}
                />
                {recognition && (
                  <Button
                    size="sm"
                    onClick={toggleListening}
                    disabled={isLoading}
                    className={`h-9 w-9 sm:h-10 sm:w-10 p-0 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                  >
                    {isListening ? <MicOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Mic className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </Button>
                )}
                {canStop || isTyping ? (
                  <Button
                    size="sm"
                    onClick={stopTyping}
                    className="bg-red-500 hover:bg-red-600 h-9 w-9 sm:h-10 sm:w-10 p-0"
                    title="Stop AI response"
                  >
                    <Square className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading || isListening}
                    className="bg-purple-600 hover:bg-purple-700 h-9 w-9 sm:h-10 sm:w-10 p-0"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>
            </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}
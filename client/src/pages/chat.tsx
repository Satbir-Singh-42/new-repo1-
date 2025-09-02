import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Bot,
  User,
  Home,
  Sun,
  AlertTriangle,
  CheckCircle,
  Settings,
  Lightbulb,
  HelpCircle,
  CloudSun,
  Mic,
  MicOff,
  Menu,
  Search,
  MessageCircle,
  X,
  Square,
  ChevronDown,
  Copy,
  Check,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LazyLoading } from "@/components/ui/lazy-loading";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";

interface ChatMessage {
  id: number;
  message: string;
  sender: "user" | "ai";
  timestamp: Date;
  category?: string;
}

interface QuickPrompt {
  title: string;
  prompt: string;
  icon: React.ReactNode;
  category: string;
}

const quickPrompts: QuickPrompt[] = [
  {
    title: "Installation Planning",
    prompt: "How do I plan the optimal solar panel installation for my roof?",
    icon: <Sun className="h-4 w-4" />,
    category: "installation",
  },
  {
    title: "Fault Detection",
    prompt: "How can I identify and troubleshoot solar panel defects?",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: "fault",
  },
  {
    title: "Maintenance Tips",
    prompt: "What's the best maintenance schedule for solar panels?",
    icon: <Settings className="h-4 w-4" />,
    category: "maintenance",
  },
  {
    title: "Performance Optimization",
    prompt: "How can I improve my solar panel system's performance?",
    icon: <CheckCircle className="h-4 w-4" />,
    category: "performance",
  },
  {
    title: "System Sizing",
    prompt: "How do I determine the right solar system size for my needs?",
    icon: <Lightbulb className="h-4 w-4" />,
    category: "installation",
  },
  {
    title: "Weather Impact",
    prompt: "How do weather conditions affect solar panel performance?",
    icon: <Sun className="h-4 w-4" />,
    category: "performance",
  },
  {
    title: "Indian Helplines",
    prompt:
      "Please provide Indian solar energy helpline numbers for support and assistance",
    icon: <HelpCircle className="h-4 w-4" />,
    category: "helpline",
  },
  {
    title: "Cost Analysis",
    prompt:
      "Help me understand solar panel costs, financing options, and ROI calculations",
    icon: <Settings className="h-4 w-4" />,
    category: "cost",
  },
];

export default function Chat() {
  const { user, logoutMutation } = useAuth();
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(() => {
    // Only show online status if there are no user messages in the chat history
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatPageMessages");
      if (saved) {
        try {
          const parsedMessages = JSON.parse(saved);
          const hasUserMessages = parsedMessages.some(
            (msg: any) => msg.sender === "user"
          );
          return !hasUserMessages;
        } catch (e) {
          return true;
        }
      }
    }
    return true;
  });
  const [showQuickStart, setShowQuickStart] = useState(() => {
    // Only show quick start if there are no user messages in the chat history
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatPageMessages");
      if (saved) {
        try {
          const parsedMessages = JSON.parse(saved);
          const hasUserMessages = parsedMessages.some(
            (msg: any) => msg.sender === "user"
          );
          return !hasUserMessages;
        } catch (e) {
          return true;
        }
      }
    }
    return true;
  });

  const [apiStatus, setApiStatus] = useState<
    "connected" | "error" | "checking"
  >("checking");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      // Load messages based on user authentication status
      const storageKey = user
        ? `chatPageMessages_${user.id}`
        : "chatPageMessages_guest";
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (e) {
          console.error("Error parsing saved chat messages:", e);
        }
      }
    }
    // Add greeting message for first-time users
    return [
      {
        id: 1,
        message:
          "Hello! I'm your SolarSense AI assistant. I'm here to help you with energy trading, household energy optimization, battery management, and decentralized energy distribution. How can I assist you today?",
        sender: "ai",
        timestamp: new Date(),
        category: "greeting",
      },
    ];
  });
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [displayedText, setDisplayedText] = useState<{ [key: number]: string }>(
    {}
  );
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save messages to localStorage when they change (user-specific storage)
  useEffect(() => {
    const storageKey = user
      ? `chatPageMessages_${user.id}`
      : "chatPageMessages_guest";
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, user]);

  // Handle user login/logout for chat persistence
  useEffect(() => {
    if (user) {
      // User logged in - restore their chat history
      const userStorageKey = `chatPageMessages_${user.id}`;
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        try {
          const userMessages = JSON.parse(saved).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(userMessages);
          // Show quick start only if user has no messages
          const hasUserMessages = userMessages.some(
            (msg: any) => msg.sender === "user"
          );
          setShowQuickStart(!hasUserMessages);
          setShowOnlineStatus(!hasUserMessages);
        } catch (e) {
          console.error("Error loading user chat messages:", e);
        }
      }
    } else {
      // User logged out - reset to guest mode
      setMessages([
        {
          id: 1,
          message:
            "Hello! I'm your SolarSense AI assistant. I'm here to help you with energy trading, household energy optimization, battery management, and decentralized energy distribution. How can I assist you today?",
          sender: "ai",
          timestamp: new Date(),
          category: "greeting",
        },
      ]);
      setShowQuickStart(true);
      setShowOnlineStatus(true);
    }
  }, [user]);

  // Check API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch("/api/health");
        if (response.ok) {
          const data = await response.json();
          // Check if AI service is online
          if (data.ai?.status === "online") {
            setApiStatus("connected");
          } else {
            // AI service is offline (missing API key, etc.)
            setApiStatus("error");
          }
        } else {
          // Server error response
          setApiStatus("error");
        }
      } catch (error) {
        // Network failure - truly offline
        setApiStatus("error");
      }
    };

    // Only check API status once on component mount to minimize unnecessary API calls
    checkApiStatus();
  }, []);

  // Handle mobile keyboard visibility
  useEffect(() => {
    // Add class to detect Visual Viewport API support
    if (window.visualViewport) {
      document.body.classList.add("visual-viewport-supported");
    }

    const handleResize = () => {
      // On mobile, when keyboard appears, the viewport height changes
      if (window.visualViewport) {
        const isKeyboardVisible =
          window.visualViewport.height < window.innerHeight;
        setIsKeyboardOpen(isKeyboardVisible);

        if (isKeyboardVisible) {
          // Keyboard is visible - adjust the layout
          document.documentElement.style.setProperty(
            "--viewport-height",
            `${window.visualViewport.height}px`
          );
          document.body.classList.add("mobile-keyboard-open");
        } else {
          // Keyboard is hidden - reset to full height
          document.documentElement.style.setProperty(
            "--viewport-height",
            "100vh"
          );
          document.body.classList.remove("mobile-keyboard-open");
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      handleResize(); // Initial call

      return () => {
        window.visualViewport.removeEventListener("resize", handleResize);
        document.body.classList.remove(
          "visual-viewport-supported",
          "mobile-keyboard-open"
        );
      };
    }
  }, []);

  // Enhanced scroll detection with touch and wheel support
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let userInteracting = false;
    let interactionTimeout: NodeJS.Timeout;
    let lastScrollTop = 0;

    const handleScroll = () => {
      const scrollElement =
        scrollContainer.querySelector("[data-radix-scroll-area-viewport]") ||
        scrollContainer.querySelector(".scroll-area-viewport") ||
        scrollContainer;

      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isAtBottom =
          Math.abs(scrollTop + clientHeight - scrollHeight) <= 10; // 10px threshold

        // Detect if user is scrolling up
        const isScrollingUp = scrollTop < lastScrollTop && userInteracting;
        lastScrollTop = scrollTop;

        if (isAtBottom && !autoScroll) {
          // User scrolled to bottom - re-enable auto-scroll
          setAutoScroll(true);
          setShowScrollButton(false);
        } else if (isScrollingUp && autoScroll) {
          // User manually scrolled up - disable auto-scroll
          setAutoScroll(false);
          setShowScrollButton(true);
        } else if (!isAtBottom && !autoScroll) {
          // User is away from bottom - show scroll button
          setShowScrollButton(true);
        } else if (isAtBottom && autoScroll) {
          // At bottom with autoscroll - hide button
          setShowScrollButton(false);
        }
      }
    };

    const handleUserInteraction = () => {
      userInteracting = true;
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        userInteracting = false;
      }, 200);
    };

    const handleTouchStart = () => handleUserInteraction();
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 3) {
        // More sensitive wheel movements
        handleUserInteraction();
      }
    };

    // Add listeners to the actual scrollable element
    const scrollElement =
      scrollContainer.querySelector("[data-radix-scroll-area-viewport]") ||
      scrollContainer.querySelector(".scroll-area-viewport") ||
      scrollContainer;

    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll, { passive: true });
      scrollElement.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      scrollElement.addEventListener("wheel", handleWheel, { passive: true });

      return () => {
        scrollElement.removeEventListener("scroll", handleScroll);
        scrollElement.removeEventListener("touchstart", handleTouchStart);
        scrollElement.removeEventListener("wheel", handleWheel);
        clearTimeout(interactionTimeout);
      };
    }
  }, [autoScroll]);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    }
  }, []);

  // AI chat mutation with conversation history
  const aiChatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Build conversation history for context (last 10 messages)
      const conversationHistory = messages
        .slice(-10)
        .map(
          (msg) => `${msg.sender === "user" ? "User" : "AI"}: ${msg.message}`
        );

      const response = await apiRequest("POST", "/api/ai/chat", {
        message: userMessage,
        conversationHistory,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (response) => {
      // Update API status - if we get any response, API is connected
      setApiStatus("connected");

      const newMessageId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId,
          message: response.response,
          sender: "ai",
          timestamp: new Date(),
          category: response.category || "general",
        },
      ]);
      // Start typing animation and enable auto-scroll for new AI messages
      setTypingMessageId(newMessageId);
      setAutoScroll(true);
    },
    onError: (error: any) => {
      // Set to error for any API failure - if AI can't respond, it's offline from user perspective
      setApiStatus("error");
      console.error("AI Chat error:", error);

      // Create a more helpful error message based on the error type
      let errorMessage = "I'm having trouble connecting right now. ";

      if (error instanceof Error) {
        if (
          error.message.includes("503") ||
          error.message.includes("overloaded") ||
          error.message.includes("UNAVAILABLE")
        ) {
          errorMessage =
            "The AI service is currently experiencing high demand. Please wait a few minutes and try again. ";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "The request timed out. Please try again with a shorter message. ";
        } else if (error.message.includes("network")) {
          errorMessage =
            "Network connection failed. Please check your internet connection and try again. ";
        }
      }

      // Add helpful suggestions based on the last user message
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.sender === "user") {
        const userMsg = lastUserMessage.message.toLowerCase();
        if (userMsg.includes("install") || userMsg.includes("roof")) {
          errorMessage +=
            "For installation questions, I recommend focusing on roof assessment, system sizing, permits, and professional installation. ";
        } else if (userMsg.includes("fault") || userMsg.includes("problem")) {
          errorMessage +=
            "For troubleshooting, check for shading issues, dirty panels, loose connections, and inverter problems. ";
        } else if (
          userMsg.includes("maintenance") ||
          userMsg.includes("clean")
        ) {
          errorMessage +=
            "For maintenance, focus on regular cleaning, visual inspections, and performance monitoring. ";
        } else {
          errorMessage +=
            "I can help with installation planning, fault detection, maintenance, and performance optimization. ";
        }
      } else {
        errorMessage +=
          "I can help with installation planning, fault detection, maintenance, and performance optimization. ";
      }

      errorMessage += "Please try your question again.";

      const errorMessageId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          message: errorMessage,
          sender: "ai",
          timestamp: new Date(),
          category: "error",
        },
      ]);
      // Start typing animation for error messages too
      setTypingMessageId(errorMessageId);
    },
  });

  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      // Try multiple selectors to find the scrollable element
      const scrollElement =
        scrollRef.current.querySelector("[data-radix-scroll-area-viewport]") ||
        scrollRef.current.querySelector(".scroll-area-viewport") ||
        scrollRef.current;

      if (scrollElement) {
        // Use multiple approaches to ensure scrolling works
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        const maxScrollTop = scrollHeight - clientHeight;

        if (maxScrollTop > 0) {
          if (smooth) {
            scrollElement.scrollTo({
              top: maxScrollTop,
              behavior: "smooth",
            });
          } else {
            scrollElement.scrollTop = maxScrollTop;
          }
        }
      }
    }
  };

  // Enhanced auto-scroll when new messages are added or during typing (only if auto-scroll is enabled)
  useEffect(() => {
    if (autoScroll) {
      // Multiple attempts to ensure scrolling works
      const timeoutId1 = setTimeout(() => scrollToBottom(false), 50);
      const timeoutId2 = setTimeout(() => scrollToBottom(true), 200);
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
      };
    }
  }, [messages, displayedText, autoScroll]);

  // Additional scroll trigger for typing animation
  useEffect(() => {
    if (isTyping && autoScroll) {
      const intervalId = setInterval(() => {
        scrollToBottom(false);
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, [isTyping, autoScroll]);

  // Typing animation effect
  useEffect(() => {
    if (typingMessageId !== null) {
      const message = messages.find((m) => m.id === typingMessageId);
      if (message && message.sender === "ai") {
        const fullText = message.message;
        let currentIndex = 0;
        setIsTyping(true);

        const typeText = () => {
          if (currentIndex < fullText.length) {
            setDisplayedText((prev) => ({
              ...prev,
              [typingMessageId]: fullText.substring(0, currentIndex + 1),
            }));
            currentIndex++;

            // Much faster typing animation - reduced delays for quicker response
            const char = fullText[currentIndex - 1];
            const delay = char === " " ? 2 : char.match(/[.!?]/) ? 15 : 4;

            typingTimeoutRef.current = setTimeout(typeText, delay);
          } else {
            setTypingMessageId(null);
            setIsTyping(false);
            setDisplayedText((prev) => {
              const newState = { ...prev };
              delete newState[typingMessageId];
              return newState;
            });
            // Don't automatically show quick start prompts - let normal logic handle it
          }
        };

        typeText();
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [typingMessageId, messages]);

  // Remove duplicate useEffect that was causing conflicts

  useEffect(() => {
    // Auto-scroll when quick start is hidden (prompt bar height changes) - only if auto-scroll is enabled
    if (!showQuickStart && autoScroll) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 300);
    }
  }, [showQuickStart, autoScroll]);

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // If there's a message being typed, keep only the partial text displayed
    if (typingMessageId !== null) {
      const currentPartialText = displayedText[typingMessageId];
      if (currentPartialText) {
        // Update the actual message with the partial text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingMessageId
              ? { ...msg, message: currentPartialText }
              : msg
          )
        );
      }
    }

    setTypingMessageId(null);
    setIsTyping(false);
    setDisplayedText({});
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || aiChatMutation.isPending || isTyping) return;

    const userMessage = {
      id: Date.now(),
      message: message.trim(),
      sender: "user" as const,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    // Enable auto-scroll for new user messages
    setAutoScroll(true);

    // Hide online status and quick start after first user message
    if (showOnlineStatus) {
      setTimeout(() => setShowOnlineStatus(false), 1000);
    }
    if (showQuickStart) {
      setShowQuickStart(false);
    }

    // Trigger AI response
    aiChatMutation.mutate(message.trim());
  };

  const handleStopOrSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTyping) {
      stopTyping();
    } else {
      handleSendMessage(e);
    }
  };

  const handleQuickPrompt = (prompt: QuickPrompt) => {
    if (aiChatMutation.isPending || isTyping) return;

    const userMessage = {
      id: Date.now(),
      message: prompt.prompt,
      sender: "user" as const,
      timestamp: new Date(),
      category: prompt.category,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Hide online status and quick start after first user message
    if (showOnlineStatus) {
      setTimeout(() => setShowOnlineStatus(false), 1000);
    }
    if (showQuickStart) {
      setShowQuickStart(false);
    }

    // Trigger AI response
    aiChatMutation.mutate(prompt.prompt);
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

  const startNewConversation = () => {
    // Clear localStorage for both user and guest modes
    const storageKey = user
      ? `chatPageMessages_${user.id}`
      : "chatPageMessages_guest";
    localStorage.removeItem(storageKey);

    // Also clear any legacy keys
    localStorage.removeItem("chatPageMessages");

    // Reset state to initial values with greeting message
    setMessages([
      {
        id: 1,
        message:
          "Hello! I'm your SolarSense AI assistant. I'm here to help you with energy trading, household energy optimization, battery management, and decentralized energy distribution. How can I assist you today?",
        sender: "ai",
        timestamp: new Date(),
        category: "greeting",
      },
    ]);

    // Reset all UI states for new conversation
    setShowQuickStart(true); // Show quick start for new conversation
    setShowOnlineStatus(true); // Show online status for new conversation
    setMessage(""); // Clear input field
    setTypingMessageId(null); // Clear typing animation
    setDisplayedText({}); // Clear displayed text cache
    setIsTyping(false); // Clear typing state
    setCopiedMessageId(null); // Clear copied message state
    setAutoScroll(true); // Enable auto-scroll for new conversation

    // Clear any typing timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Copy message functionality
  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      // Remove markdown formatting for plain text copy
      const plainText = text
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/`(.*?)`/g, "$1") // Remove inline code
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks
        .replace(/#{1,6}\s+(.*)/g, "$1") // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
        .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
        .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered lists
        .trim();

      await navigator.clipboard.writeText(plainText);

      // Show copy success feedback
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const getMessageColor = (sender: string, category?: string) => {
    if (sender === "ai") {
      switch (category) {
        case "installation":
          return "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500";
        case "fault":
          return "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500";
        case "maintenance":
          return "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500";
        case "performance":
          return "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500";
        case "welcome":
          return "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500";
        case "error":
          return "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500";
        default:
          return "bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-300";
      }
    }
    return "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500";
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar currentPage="chat" />

      {/* Main Content */}
      <main
        className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-0 pt-20">
        <div className="flex flex-col chat-container h-[calc(100svh-60px)] max-h-[calc(100svh-60px)] md:h-[calc(100vh-60px)] md:max-h-[calc(100vh-60px)]">
          {/* Chat Area - Positioned directly above prompt bar */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            <Card className="h-full flex flex-col shadow-lg border rounded-lg overflow-hidden max-w-full lg:max-w-6xl mx-auto w-full">
              <CardHeader className="py-3 sm:py-3 md:py-4 px-4 sm:px-4 md:px-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                      <img
                        src="/assets/robot-chat-bot-concept-illustration-vector_1752050227392.jpg"
                        alt="AI Assistant"
                        className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 object-cover rounded-md"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        SolarSense AI
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Solar panel expert ready to help
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`flex items-center gap-1 px-2 py-1 transition-all duration-300 ${
                        apiStatus === "connected"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : apiStatus === "error"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          apiStatus === "connected"
                            ? "bg-green-500 animate-pulse"
                            : apiStatus === "error"
                            ? "bg-red-500"
                            : "bg-yellow-500 animate-bounce"
                        }`}></div>
                      <span className="text-xs font-medium">
                        {apiStatus === "connected"
                          ? "Online"
                          : apiStatus === "error"
                          ? "Offline"
                          : "Checking"}
                      </span>
                    </Badge>
                    {/* New Conversation Button - Only show if there are user messages */}
                    {messages.some((msg) => msg.sender === "user") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={startNewConversation}
                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                        title="Start new conversation">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0 relative min-h-0">
                {/* Messages Area - Scrollable with proper desktop padding */}
                <ScrollArea
                  className="flex-1 px-3 sm:px-4 md:px-8 lg:px-12 pt-1 sm:pt-2 md:pt-3 transition-all duration-300 chat-scroll-area"
                  ref={scrollRef}
                  style={{ overflowY: "auto" }}>
                  <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`relative flex items-start gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 rounded-lg group ${getMessageColor(
                          msg.sender,
                          msg.category
                        )}`}>
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 p-0 overflow-hidden">
                            {msg.sender === "ai" ? (
                              <img
                                src="/assets/robot-chat-bot-concept-illustration-vector_1752050227392.jpg"
                                alt="AI Assistant"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center rounded-full">
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-6 w-6 text-white"
                                  fill="currentColor">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <span className="font-medium text-xs sm:text-sm">
                              {msg.sender === "ai" ? "SolarSense AI" : "You"}
                            </span>
                            {msg.category && msg.category !== "general" && (
                              <Badge
                                variant="secondary"
                                className="text-xs hidden sm:inline-flex">
                                {msg.category}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(msg.timestamp, "HH:mm")}
                            </span>
                          </div>
                          <div className="text-sm md:text-base leading-relaxed prose prose-sm md:prose-base max-w-none dark:prose-invert">
                            {msg.sender === "ai" ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => (
                                    <p className="mb-3 last:mb-0 text-gray-800 dark:text-gray-200">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="mb-3 last:mb-0 ml-4 list-disc text-gray-800 dark:text-gray-200">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="mb-3 last:mb-0 ml-4 list-decimal text-gray-800 dark:text-gray-200">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="mb-2 text-gray-800 dark:text-gray-200">
                                      {children}
                                    </li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-gray-900 dark:text-gray-100">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic text-gray-800 dark:text-gray-200">
                                      {children}
                                    </em>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-lg sm:text-xl font-bold mb-3 mt-3 text-gray-900 dark:text-gray-100">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base sm:text-lg font-semibold mb-3 mt-3 text-gray-900 dark:text-gray-100">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm sm:text-base font-semibold mb-2 mt-2 text-gray-900 dark:text-gray-100">
                                      {children}
                                    </h3>
                                  ),
                                  h4: ({ children }) => (
                                    <h4 className="text-sm sm:text-base font-semibold mb-2 mt-2 text-gray-900 dark:text-gray-100">
                                      {children}
                                    </h4>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto mb-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <table className="min-w-full border-collapse text-xs">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({ children }) => (
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                      {children}
                                    </thead>
                                  ),
                                  tbody: ({ children }) => (
                                    <tbody className="bg-white dark:bg-gray-900">
                                      {children}
                                    </tbody>
                                  ),
                                  tr: ({ children }) => (
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                      {children}
                                    </tr>
                                  ),
                                  th: ({ children }) => (
                                    <th className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                      {children}
                                    </td>
                                  ),
                                  code: ({ children, className }) => {
                                    const isInline =
                                      !className?.includes("language-");
                                    return isInline ? (
                                      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono text-purple-600 dark:text-purple-400">
                                        {children}
                                      </code>
                                    ) : (
                                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono overflow-x-auto mb-2 border border-gray-200 dark:border-gray-700">
                                        <code className="text-gray-800 dark:text-gray-200">
                                          {children}
                                        </code>
                                      </pre>
                                    );
                                  },
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-purple-500 pl-3 italic text-gray-600 dark:text-gray-400 mb-2 bg-gray-50 dark:bg-gray-800 py-2 rounded-r">
                                      {children}
                                    </blockquote>
                                  ),
                                  hr: () => (
                                    <hr className="my-3 border-gray-200 dark:border-gray-700" />
                                  ),
                                }}>
                                {typingMessageId === msg.id
                                  ? displayedText[msg.id] || ""
                                  : msg.message}
                              </ReactMarkdown>
                            ) : (
                              <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                                {msg.message}
                              </div>
                            )}
                            {typingMessageId === msg.id && (
                              <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1 rounded-sm"></span>
                            )}
                          </div>
                        </div>
                        {/* Copy button positioned at bottom right corner for AI messages - only visible on hover */}
                        {msg.sender === "ai" && typingMessageId !== msg.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(msg.message, msg.id)}
                            className="absolute bottom-2 right-2 h-6 w-6 p-0 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-600/60 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100"
                            title="Copy message">
                            {copiedMessageId === msg.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}

                    {aiChatMutation.isPending && (
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 p-0 overflow-hidden">
                            <img
                              src="/assets/robot-chat-bot-concept-illustration-vector_1752050227392.jpg"
                              alt="AI Assistant"
                              className="w-full h-full object-cover"
                            />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <span className="font-medium text-xs sm:text-sm">
                              SolarSense AI
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Analyzing...
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="animate-bounce w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"></div>
                            <div
                              className="animate-bounce w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"
                              style={{ animationDelay: "0.1s" }}></div>
                            <div
                              className="animate-bounce w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"
                              style={{ animationDelay: "0.2s" }}></div>
                            <span className="text-xs text-purple-600 ml-1 sm:ml-2">
                              Thinking about your solar question...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="fixed bottom-24 right-4 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoScroll(true);
              scrollToBottom(true);
            }}
            className="h-12 w-12 rounded-full bg-white/90 hover:bg-white border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
            title="Scroll to bottom">
            <ChevronDown className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      )}

      {/* Fixed Bottom Section - Quick Start above Prompt Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mobile-fixed-bottom safe-bottom">
        {/* Quick Start Section - Positioned above prompt bar */}
        {showQuickStart && (
          <div className="mb-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="px-4 md:px-6 lg:px-8 py-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                  Quick Start:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickStart(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                  <X className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                </Button>
              </div>
              {/* Responsive grid layout optimized for full screen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={aiChatMutation.isPending || isTyping}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs px-2 py-2 h-auto text-left justify-start hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300 transition-all duration-200 min-h-[36px] sm:min-h-[40px]">
                    <span className="flex-shrink-0 text-sm">{prompt.icon}</span>
                    <span className="font-medium leading-tight truncate text-xs sm:text-sm">
                      {prompt.title}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prompt Bar - Always at bottom */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="px-4 md:px-6 lg:px-8 py-4">
            <form onSubmit={handleStopOrSend} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything about solar panels..."
                  className="pr-10 sm:pr-12 h-11 sm:h-12 text-sm border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200"
                  disabled={aiChatMutation.isPending || isTyping}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleStopOrSend(e);
                    }
                  }}
                />
                {aiChatMutation.isPending && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  </div>
                )}
              </div>
              {recognition && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`h-11 sm:h-12 px-2 sm:px-3 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200 ${
                    isListening
                      ? "bg-red-100 dark:bg-red-900/20 text-red-600 border-red-400"
                      : "text-gray-500 border-gray-300"
                  }`}
                  onClick={toggleListening}
                  disabled={aiChatMutation.isPending || isTyping}>
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                className={`h-11 sm:h-12 px-3 sm:px-4 transition-all duration-200 ${
                  isTyping
                    ? "bg-red-600 hover:bg-red-800 text-white dark:bg-red-500 dark:hover:bg-red-700"
                    : "bg-purple-600 hover:bg-purple-800 text-white dark:bg-purple-500 dark:hover:bg-purple-700"
                }`}
                disabled={
                  (!message.trim() && !isTyping) || aiChatMutation.isPending
                }>
                {isTyping ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

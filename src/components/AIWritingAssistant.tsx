import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, RefreshCw, X, Sparkles, FileText, Lightbulb } from 'lucide-react';
import { generateAIContent } from '../lib/openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIWritingAssistantProps {
  onInsertContent: (content: string) => void;
  pageType?: string;
  currentContent?: string;
}

export default function AIWritingAssistant({ onInsertContent, pageType = 'general', currentContent = '' }: AIWritingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when first opened
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi! I'm your AI writing assistant. I can help you create content for your ${pageType} page. Here are some things I can help with:

• Write professional content from scratch
• Improve existing content
• Suggest better wording and structure
• Create specific sections like privacy policies, terms of service, etc.
• Adapt content for your car audio events platform

What would you like me to help you write today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, pageType]);

  const getContentSuggestions = () => {
    const suggestions = {
      'privacy-policy': [
        'Write a comprehensive privacy policy',
        'Explain data collection practices',
        'Add GDPR compliance section'
      ],
      'terms-of-service': [
        'Create terms of service',
        'Add user responsibilities section',
        'Include liability limitations'
      ],
      'about': [
        'Write an engaging about us page',
        'Describe our mission and values',
        'Add team information section'
      ],
      'general': [
        'Help me write professional content',
        'Improve my existing text',
        'Create engaging copy'
      ]
    };
    
    return suggestions[pageType as keyof typeof suggestions] || suggestions.general;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Generate AI response using the OpenAI utility
      const response = await generateAIContent({
        message: inputMessage,
        pageType: pageType,
        currentContent: currentContent
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  const insertContent = (content: string) => {
    onInsertContent(content);
    // You could add a success notification here
  };

  const clearChat = () => {
    setMessages([]);
    setIsOpen(false);
    setTimeout(() => setIsOpen(true), 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-electric-500 text-white p-4 rounded-full shadow-lg hover:bg-electric-600 transition-all duration-200 z-50 flex items-center space-x-2"
        title="AI Writing Assistant"
      >
        <Sparkles className="h-6 w-6" />
        <span className="hidden sm:block font-medium">AI Writer</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-electric-500 to-purple-600 rounded-t-xl">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-white" />
          <h3 className="font-medium text-white">AI Writing Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="text-white/80 hover:text-white transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="p-3 border-b border-gray-700 bg-gray-700/30">
        <p className="text-xs text-gray-400 mb-2">Quick suggestions:</p>
        <div className="flex flex-wrap gap-1">
          {getContentSuggestions().map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded hover:bg-gray-500 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-electric-500 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && <Bot className="h-4 w-4 mt-0.5 text-electric-400" />}
                {message.role === 'user' && <User className="h-4 w-4 mt-0.5" />}
                <div className="flex-1">
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="text-xs text-gray-400 hover:text-gray-200 flex items-center space-x-1"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => insertContent(message.content)}
                        className="text-xs text-electric-400 hover:text-electric-300 flex items-center space-x-1"
                        title="Insert into editor"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Insert</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-electric-400" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-electric-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-electric-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-electric-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me to help write content..."
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-electric-500 text-white p-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 
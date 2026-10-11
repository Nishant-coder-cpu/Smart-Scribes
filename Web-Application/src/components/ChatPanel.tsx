'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, MessageCircle, Copy, Check, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  lectureContent?: unknown;
  onClose?: () => void;
}

export function ChatPanel({ lectureContent, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Smart Scribes AI Tutor. Ask me any question about your lecture notes, mathematical derivations, or concept applications!",
      timestamp: new Date(),
    },
  ]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    'Explain this concept in simple terms',
    'Show a step-by-step mathematical derivation',
    'Provide a practical real-world engineering example',
    'Quiz me on the main formulas from this lecture',
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText ?? inputRef.current?.value ?? '';
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (inputRef.current) inputRef.current.value = '';
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend.trim(),
          lectureContent:
            lectureContent == null
              ? null
              : typeof lectureContent === 'string'
              ? lectureContent
              : JSON.stringify(lectureContent),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error connecting to the model. Please verify your credentials and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white select-none border-l border-slate-200">
      {/* ─── Header ─── */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">Smart AI Tutor</h2>
            <p className="text-[10px] text-slate-500">Autonomous concept assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setMessages([
                {
                  id: '1',
                  role: 'assistant',
                  content: "Hello! I'm your Smart Scribes AI Tutor. Ask me any question about your lecture notes!",
                  timestamp: new Date(),
                },
              ])
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            title="Reset Chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Messages Viewport ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5 ${
                  isUser
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-blue-700 font-bold border border-slate-200'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed relative ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-slate-100/90 text-slate-800 rounded-tl-xs border border-slate-200/60'
                }`}
              >
                <p className="whitespace-pre-line font-normal">{message.content}</p>

                <div
                  className={`flex items-center justify-between text-[10px] mt-1.5 pt-1 border-t ${
                    isUser
                      ? 'border-blue-500/40 text-blue-200'
                      : 'border-slate-200/60 text-slate-400'
                  }`}
                >
                  <span>
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {!isUser && (
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="hover:text-slate-700 flex items-center gap-0.5 ml-2"
                      title="Copy response"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-blue-700 flex items-center justify-center shrink-0 border border-slate-200">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-xs border border-slate-200/60">
              <div className="flex gap-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Suggested Prompt Pills ─── */}
      <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-1.5">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p)}
              disabled={isTyping}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 border border-slate-200 transition-colors shrink-0"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Input Box ─── */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-center">
          <textarea
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about this lecture..."
            className="flex-1 resize-none bg-slate-50 rounded-xl p-2.5 text-xs text-slate-800 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={2}
          />
          <button
            onClick={() => handleSend()}
            disabled={isTyping}
            type="button"
            className="shrink-0 h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors shadow-2xs"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          Press Enter to send • Powered by Multimodal LLM
        </p>
      </div>
    </div>
  );
}

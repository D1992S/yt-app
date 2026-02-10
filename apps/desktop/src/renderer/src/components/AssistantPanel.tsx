import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';
import { ChatMessage } from '@insight/shared';

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  llmSettings?: {
    provider?: 'openai' | 'gemini';
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ isOpen, onClose, llmSettings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await window.electron.llm.generate({
        question: userMsg.content,
        provider: llmSettings?.provider,
        model: llmSettings?.model,
        temperature: llmSettings?.temperature,
        maxOutputTokens: llmSettings?.maxOutputTokens,
      });
      setMessages(prev => [...prev, response]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd podczas przetwarzania zapytania.',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-96 bg-white border-l border-slate-200 shadow-xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Bot className="text-indigo-600" size={20} />
          Asystent AI
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10 text-sm">
            <p>Zapytaj mnie o dane.</p>
            <p className="mt-2 text-xs">Np. "Jakie były wyświetlenia w zeszłym tygodniu?"</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs opacity-70">
                  Źródło: {msg.evidence.map(e => e.source).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-lg text-sm text-slate-500">
              Analizuję dane...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zadaj pytanie..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AiPersonaId, AI_PERSONAS } from '../types';
import { Sparkles, Send, Copy, Check, Trash2, Bot, User } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  selectedPersona: AiPersonaId;
  isGenerating: boolean;
  onSendMessage: (prompt: string) => void;
  onSelectPersona: (persona: AiPersonaId) => void;
  onClearChat: () => void;
}

export const AiChatScreen: React.FC<Props> = ({
  messages,
  selectedPersona,
  isGenerating,
  onSendMessage,
  onSelectPersona,
  onClearChat
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = (text: string) => {
    if (!text.trim() || isGenerating) return;
    onSendMessage(text.trim());
    setInputText('');
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickChips = [
    'Analyze Best Trade Now (XAU/USD)',
    'Calculate 1% risk for $1,000',
    'Explain Fair Value Gaps (FVG)',
    'London / NY session plan'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto pb-4">
      {/* Top Bar with Personas & Clear Chat */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2979FF]" />
            <span className="text-sm font-bold text-[#F1F5F9]">FX Institutional Copilot</span>
            <span className="text-[10px] font-bold text-[#2979FF] bg-[#2979FF]/10 px-2 py-0.5 rounded border border-[#2979FF]/30">
              Gemini 3.5 Flash
            </span>
          </div>

          <button
            onClick={onClearChat}
            className="p-1.5 text-[#64748B] hover:text-[#FF3366] rounded-lg transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Persona Selectors */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(Object.keys(AI_PERSONAS) as AiPersonaId[]).map(id => {
            const persona = AI_PERSONAS[id];
            const isSelected = selectedPersona === id;
            return (
              <button
                key={id}
                onClick={() => onSelectPersona(id)}
                className={`px-3 py-1.5 rounded-lg border text-left shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#182033] border-[#2979FF] text-[#2979FF]'
                    : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <div className="text-xs font-bold">{persona.title}</div>
                <div className="text-[9px] text-[#64748B]">{persona.badge}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3 text-left">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}
          >
            {/* Header info */}
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {msg.isUser ? (
                <span className="text-[10px] font-semibold text-[#94A3B8]">You</span>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-[#2979FF]" />
                  <span className="text-[10px] font-bold text-[#2979FF]">FX Copilot</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 border text-xs sm:text-sm leading-relaxed ${
                msg.isUser
                  ? 'bg-[#2979FF] border-[#2979FF] text-[#F1F5F9] rounded-tr-xs'
                  : 'bg-[#101522] border-[#222F47] text-[#F1F5F9] rounded-tl-xs shadow-md'
              }`}
            >
              {msg.isGenerating ? (
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-full bg-[#2979FF] animate-ping" />
                  <span>Analyzing order book, SMC liquidity voids, and institutional confluence...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>
              )}

              {/* Copy button on assistant messages */}
              {!msg.isUser && !msg.isGenerating && (
                <div className="flex justify-end mt-2 pt-2 border-t border-[#222F47]/50">
                  <button
                    onClick={() => copyText(msg.id, msg.text)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#94A3B8] hover:text-[#F1F5F9]"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-[#00E676]" />
                        <span className="text-[#00E676]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Suggested Prompts if any */}
            {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-2xl">
                {msg.suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="text-[10px] font-semibold bg-[#182033] hover:bg-[#222F47] text-[#2979FF] border border-[#2979FF]/30 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="text-[11px] font-semibold bg-[#101522] hover:bg-[#182033] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#222F47] px-3 py-1 rounded-full shrink-0 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="flex items-center gap-2 bg-[#101522] border border-[#222F47] rounded-2xl p-2 shadow-lg"
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ask about XAU/USD, 1% risk math, SMC, Order Blocks..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isGenerating}
          className={`p-2.5 rounded-xl transition-all ${
            inputText.trim() && !isGenerating
              ? 'bg-[#2979FF] hover:bg-[#2979FF]/90 text-[#F1F5F9]'
              : 'bg-[#182033] text-[#64748B] cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

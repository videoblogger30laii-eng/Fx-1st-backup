import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AiPersonaId, AI_PERSONAS } from '../types';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Trash2,
  Bot,
  Globe,
  ShieldAlert,
  Zap,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  X,
  ImagePlus,
  Pencil,
  RotateCcw,
  AlertTriangle,
  ArrowDown
} from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  selectedPersona: AiPersonaId;
  isGenerating: boolean;
  onSendMessage: (prompt: string, signalCtx?: undefined, imageDataUrl?: string | null) => void;
  onSelectPersona: (persona: AiPersonaId) => void;
  onClearChat: () => void;
  onDeleteMessage?: (id: string) => void;
}

type UniversalCategory = 'ALL' | 'NEWS' | 'TRADES' | 'ANALYSIS' | 'RISK';

export const AiChatScreen: React.FC<Props> = ({
  messages,
  selectedPersona,
  isGenerating,
  onSendMessage,
  onSelectPersona,
  onClearChat,
  onDeleteMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string>('');
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [universalCategory, setUniversalCategory] = useState<UniversalCategory>('ALL');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputFormRef = useRef<HTMLFormElement | null>(null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom when messages update or generating
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isGenerating]);

  // Monitor scroll position to show a floating "Scroll to Bottom" button if scrolled up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottomBtn(isScrolledUp);
  };

  // Compress & resize uploaded image for fast upload
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setAttachedImageName(file.name || 'screenshot.jpg');

    const reader = new FileReader();
    reader.onload = e => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.84);
          setAttachedImage(compressed);
        } else {
          setAttachedImage(rawDataUrl);
        }
      };
      img.onerror = () => {
        setAttachedImage(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  };

  const handleSend = (text: string, overrideImage?: string | null) => {
    const imgToSend = overrideImage !== undefined ? overrideImage : attachedImage;
    if ((!text.trim() && !imgToSend) || isGenerating) return;

    const finalPrompt =
      text.trim() ||
      '📸 Analyze this uploaded screenshot in detail: identify any pairs, chart patterns, MT5 positions/orders, price levels, or news shown, and give your actionable trading recommendation.';

    onSendMessage(finalPrompt, undefined, imgToSend);
    setInputText('');
    setAttachedImage(null);
    setAttachedImageName('');
    setEditingMessageId(null);
    setIsInputFocused(false);
    setTimeout(() => scrollToBottom('smooth'), 100);
  };

  const handleEditQuestion = (msg: ChatMessage) => {
    setInputText(msg.text);
    setEditingMessageId(msg.id);
    if (msg.imageUrl) {
      setAttachedImage(msg.imageUrl);
      setAttachedImageName('Attached image');
    }
    inputElementRef.current?.focus();
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setInputText('');
    setAttachedImage(null);
    setAttachedImageName('');
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getQuickChips = (): string[] => {
    if (attachedImage) {
      return [
        '🔍 Analyze this screenshot (Pair, Entry, SL, TP & Bias)',
        '📊 Should I BUY, SELL, or HOLD based on this image?',
        '🛡️ Audit my open MT5 trades & risk in this screenshot',
        '📰 Explain the news / economic data in this image'
      ];
    }

    if (selectedPersona === 'UNIVERSAL') {
      switch (universalCategory) {
        case 'NEWS':
          return [
            'What high-impact news is coming today & how will it affect pairs?',
            'How does US CPI / NFP impact XAU/USD and EUR/USD?',
            'What happens to signals when news timer finishes?',
            'How should I adjust my trade strategy before & after news?'
          ];
        case 'TRADES':
          return [
            'Analyze Best Trade Now (XAU/USD)',
            'Analyze GBP/CAD live price, strength & news bias',
            'Should I re-enter GBP/CAD after hitting Stop Loss?',
            'Which currency pair has the strongest trend right now?',
            'Analyze USD/CHF and AUD/USD institutional setup'
          ];
        case 'ANALYSIS':
          return [
            'Compare Smart Money (FVG/Order Blocks) vs RSI & EMA indicators',
            'What is the strongest vs weakest currency right now?',
            'Best trading sessions for Gold (XAU/USD) and US30',
            'How to identify a liquidity sweep (stop hunt) before entry?'
          ];
        case 'RISK':
          return [
            'Calculate 1% risk lot size for $1,000 and $10,000 accounts',
            'How to pass a $50,000 Prop Firm challenge without hitting drawdown?',
            'When should I move my Stop Loss to Breakeven (BE)?',
            'Explain spread widening during red-folder news releases'
          ];
        case 'ALL':
        default:
          return [
            '🌐 What news is coming today & how will it impact Gold & USD?',
            '📊 Analyze Best Trade Now (XAU/USD)',
            '💪 Which currency is strongest & weakest right now?',
            '🔍 Analyze GBP/CAD live price & re-entry bias',
            '📐 Calculate 1% risk for $1,000 account',
            '🏦 Explain Fair Value Gaps (FVG) & Order Blocks'
          ];
      }
    }

    if (selectedPersona === 'RISK_MANAGER') {
      return [
        'Calculate 1% risk for $1,000 account',
        'Prop Firm drawdown survival rules ($50k account)',
        'When to take partial profit at TP1 & move SL to Breakeven?',
        'How to protect open trades during High-Impact News?'
      ];
    }

    if (selectedPersona === 'SCALPER') {
      return [
        'London / NY Overlap M15 scalping plan',
        'Best Trade Now for fast session momentum',
        'How to scalp post-news displacement after 15m cooldown',
        'Analyze US30 & NAS100 NY open breakout'
      ];
    }

    return [
      'Analyze Best Trade Now (XAU/USD)',
      'Calculate 1% risk for $1,000',
      'Explain Fair Value Gaps (FVG)',
      'London / NY session plan'
    ];
  };

  const getPersonaIcon = (id: AiPersonaId) => {
    switch (id) {
      case 'UNIVERSAL':
        return <Globe className="w-3.5 h-3.5" />;
      case 'INSTITUTIONAL':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'RISK_MANAGER':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'SCALPER':
        return <Zap className="w-3.5 h-3.5" />;
    }
  };

  const activePersonaObj = AI_PERSONAS[selectedPersona];
  const quickChips = getQuickChips();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-170px)] max-w-4xl mx-auto relative text-left">
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. TOP HEADER: Active Persona Badge & Clear Chat Action */}
      <div className="sticky top-0 z-20 bg-[#080B11]/95 backdrop-blur-md pb-2 pt-0.5">
        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-2.5 space-y-2 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsHeaderExpanded(prev => !prev)}
              className="flex items-center gap-2 flex-wrap text-left cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#2979FF] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[#F1F5F9]">
                {activePersonaObj.title}
              </span>
              <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
                {selectedPersona === 'UNIVERSAL' ? '🌐 Ask Anything + 📸 Vision' : activePersonaObj.badge}
              </span>
              <span className="text-[10px] text-[#94A3B8] flex items-center gap-0.5">
                {isHeaderExpanded ? (
                  <>
                    <span>Hide Modes</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Switch Mode</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </span>
            </button>

            {/* Clear All / Start Over Button */}
            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#94A3B8] hover:text-[#FF3366] px-2.5 py-1 rounded-lg bg-[#182033] hover:bg-[#FF3366]/15 border border-[#222F47] hover:border-[#FF3366]/40 transition-colors shrink-0 cursor-pointer shadow-xs"
              title="Clear entire conversation and start fresh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Over</span>
            </button>
          </div>

          {/* Expandable Mode Selector */}
          {isHeaderExpanded && (
            <div className="pt-2 border-t border-[#222F47]/80 space-y-2 animate-fadeIn">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(Object.keys(AI_PERSONAS) as AiPersonaId[]).map(id => {
                  const persona = AI_PERSONAS[id];
                  const isSelected = selectedPersona === id;
                  const isUniversal = id === 'UNIVERSAL';
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        onSelectPersona(id);
                        setIsHeaderExpanded(false);
                      }}
                      className={`px-3 py-2 rounded-lg border text-left shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? isUniversal
                            ? 'bg-[#00E676]/15 border-[#00E676] text-[#00E676] shadow-sm'
                            : 'bg-[#182033] border-[#2979FF] text-[#2979FF]'
                          : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {getPersonaIcon(id)}
                        <span>{persona.title}</span>
                        {isUniversal && (
                          <span className="text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded bg-[#00E676] text-[#080B11]">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-[#64748B] mt-0.5">{persona.badge}</div>
                    </button>
                  );
                })}
              </div>

              {/* Category Filter Chips for Universal Mode */}
              {selectedPersona === 'UNIVERSAL' && (
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {(
                    [
                      { id: 'ALL', label: '🌐 All Topics' },
                      { id: 'NEWS', label: '📰 News & Impact' },
                      { id: 'TRADES', label: '📊 Any Pair / Signal' },
                      { id: 'ANALYSIS', label: '🎓 Strategy & Info' },
                      { id: 'RISK', label: '📐 Risk & Prop Math' }
                    ] as { id: UniversalCategory; label: string }[]
                  ).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setUniversalCategory(cat.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                        universalCategory === cat.id
                          ? 'bg-[#2979FF] text-white border-[#2979FF]'
                          : 'bg-[#101522] text-[#94A3B8] border-[#222F47] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE AREA: SCROLLABLE CHAT MESSAGES */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 pr-1 mb-4 pt-1"
      >
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
                  <span className="text-[10px] font-bold text-[#2979FF]">
                    {selectedPersona === 'UNIVERSAL' ? 'Universal AI Copilot' : 'FX Copilot'}
                  </span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 border text-xs sm:text-sm leading-relaxed relative group ${
                msg.isUser
                  ? 'bg-[#1b3a6b] border-[#2979FF]/80 text-[#F1F5F9] rounded-tr-xs shadow-md'
                  : 'bg-[#101522] border-[#222F47] text-[#F1F5F9] rounded-tl-xs shadow-md'
              }`}
            >
              {/* Uploaded Image inside Message Bubble */}
              {msg.imageUrl && (
                <div className="mb-2.5">
                  <img
                    src={msg.imageUrl}
                    alt="Uploaded screenshot"
                    onClick={() => setZoomedImageUrl(msg.imageUrl!)}
                    className="max-h-64 w-auto rounded-xl border border-white/20 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                  />
                </div>
              )}

              {msg.isGenerating ? (
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-full bg-[#2979FF] animate-ping" />
                  <span>{msg.text}</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>
              )}

              {/* Action Toolbar on USER Messages: Copy Question & Edit Question & Delete */}
              {msg.isUser && (
                <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-white/15">
                  {/* Copy Question Button */}
                  <button
                    type="button"
                    onClick={() => copyText(msg.id, msg.text)}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-white/80 hover:text-white bg-black/20 hover:bg-black/40 px-2 py-1 rounded-md border border-white/10 transition-colors cursor-pointer"
                    title="Copy your question"
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

                  {/* Edit Question Button */}
                  <button
                    type="button"
                    onClick={() => handleEditQuestion(msg)}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-white/80 hover:text-[#00E676] bg-black/20 hover:bg-black/40 px-2 py-1 rounded-md border border-white/10 transition-colors cursor-pointer"
                    title="Edit and re-send this question"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  {/* Delete User Message Button */}
                  {onDeleteMessage && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 text-white/60 hover:text-[#FF3366] bg-black/20 hover:bg-black/40 rounded-md border border-white/10 transition-colors cursor-pointer"
                      title="Delete this message"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Action Toolbar on ASSISTANT Messages: Copy & Delete */}
              {!msg.isUser && !msg.isGenerating && (
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#222F47]/60">
                  <button
                    type="button"
                    onClick={() => copyText(msg.id, msg.text)}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-[#94A3B8] hover:text-[#F1F5F9] px-2 py-1 rounded-md hover:bg-[#182033] transition-colors cursor-pointer"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-[#00E676]" />
                        <span className="text-[#00E676]">Copied Response</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Response</span>
                      </>
                    )}
                  </button>

                  {onDeleteMessage && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 text-[#64748B] hover:text-[#FF3366] rounded-md hover:bg-[#FF3366]/10 transition-colors cursor-pointer"
                      title="Delete this response"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Suggested Follow-up Prompts */}
            {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-2xl">
                {msg.suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="text-[10px] font-semibold bg-[#182033] hover:bg-[#222F47] text-[#2979FF] border border-[#2979FF]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
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

      {/* Floating "Scroll to Bottom" button if user scrolled up */}
      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-28 right-6 z-30 p-2.5 rounded-full bg-[#182033] text-[#2979FF] hover:text-white border border-[#2979FF]/50 shadow-xl transition-all hover:scale-105 cursor-pointer flex items-center gap-1 text-xs font-bold"
        >
          <ArrowDown className="w-4 h-4" />
          <span className="hidden sm:inline">Latest</span>
        </button>
      )}

      {/* 3. BOTTOM DOCKED INPUT BAR: Fixed and accessible right at the bottom! */}
      <div className="sticky bottom-0 z-30 bg-[#080B11]/95 backdrop-blur-md pt-2 pb-1 sm:pb-2 border-t border-[#222F47]/70">
        <form
          ref={inputFormRef}
          onSubmit={e => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className={`flex flex-col gap-2 bg-[#101522] border rounded-2xl p-2.5 shadow-2xl transition-all ${
            editingMessageId
              ? 'border-[#FFD700] ring-2 ring-[#FFD700]/25'
              : isInputFocused || attachedImage
              ? 'border-[#00E676] ring-2 ring-[#00E676]/25'
              : 'border-[#2979FF]/70'
          }`}
        >
          {/* Active Edit Mode Banner */}
          {editingMessageId && (
            <div className="flex items-center justify-between bg-[#FFD700]/10 border border-[#FFD700]/40 rounded-xl px-3 py-1.5 text-xs text-[#FFD700]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Pencil className="w-3.5 h-3.5 shrink-0 text-[#FFD700]" />
                <span className="font-bold truncate">Editing your previous question — Tap Send to submit update</span>
              </div>
              <button
                type="button"
                onClick={cancelEditing}
                className="text-[11px] font-bold text-[#94A3B8] hover:text-[#FF3366] flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Attached Image Preview Banner */}
          {attachedImage && (
            <div className="flex items-center justify-between bg-[#182033] border border-[#00E676]/40 rounded-xl p-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={attachedImage}
                  alt="Upload preview"
                  onClick={() => setZoomedImageUrl(attachedImage)}
                  className="w-12 h-12 rounded-lg object-cover border border-[#00E676]/50 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#00E676] flex items-center gap-1">
                    <span>📸 Image Ready for AI Analysis</span>
                  </div>
                  <div className="text-[10.5px] text-[#94A3B8] truncate">
                    {attachedImageName || 'Screenshot attached'} • Type your question or tap Send!
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedImage(null);
                  setAttachedImageName('');
                }}
                className="p-1.5 rounded-lg bg-[#101522] text-[#94A3B8] hover:text-[#FF3366] border border-[#222F47] shrink-0 cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Suggestion Chips right above input */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-colors border cursor-pointer ${
                  attachedImage
                    ? 'bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border-[#00E676]/40'
                    : 'bg-[#182033] hover:bg-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] border-[#222F47]'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input & Action Buttons Row */}
          <div className="flex items-center gap-1.5">
            {/* Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                attachedImage
                  ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]'
                  : 'bg-[#182033] hover:bg-[#222F47] border-[#222F47] text-[#2979FF]'
              }`}
              title="Upload Chart, MT5 Screenshot, or News Image"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Photo</span>
            </button>

            {/* Input Field */}
            <input
              ref={inputElementRef}
              type="text"
              value={inputText}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsInputFocused(false), 150);
              }}
              onPaste={handlePaste}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                editingMessageId
                  ? 'Edit your question and tap Send...'
                  : attachedImage
                  ? 'Ask a question about this image (or tap Send to auto-analyze)...'
                  : selectedPersona === 'UNIVERSAL'
                  ? 'Type your question or tap 📷 to upload chart...'
                  : 'Ask about XAU/USD, 1% risk math, or upload a chart...'
              }
              className="flex-1 bg-transparent px-2 py-2 text-sm font-medium text-[#FFFFFF] placeholder-[#94A3B8] focus:outline-hidden min-w-0"
            />

            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] rounded-lg shrink-0 cursor-pointer"
                title="Clear text"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !attachedImage) || isGenerating}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                (inputText.trim() || attachedImage) && !isGenerating
                  ? editingMessageId
                    ? 'bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#080B11] shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                    : 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#080B11] shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                  : 'bg-[#182033] text-[#64748B] cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{editingMessageId ? 'Update' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Start Over / Clear Conversation */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-scaleIn text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F1F5F9]">Erase All Conversation?</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  This will clear all previous questions and AI responses to start a fresh chat session.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222F47]">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#94A3B8] hover:text-[#F1F5F9] bg-[#182033] hover:bg-[#222F47] border border-[#222F47] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearChat();
                  setShowClearConfirmModal(false);
                  setInputText('');
                  setEditingMessageId(null);
                  setAttachedImage(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#FF3366] hover:bg-[#FF3366]/90 shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Start Fresh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox for Uploaded Images */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-[#182033] text-white border border-[#222F47] shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImageUrl}
              alt="Zoomed screenshot"
              className="max-w-full max-h-[82vh] rounded-xl border border-[#222F47] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

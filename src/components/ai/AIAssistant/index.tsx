'use client';
/**
 * AIAssistant/index.tsx
 * SafariChargeAIAssistant component + AIMessageText renderer.
 *
 * All colours use CSS var tokens — no hardcoded palette.
 * Works with both .light and .dark classes from next-themes.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Send, Trash2, Copy, Check } from 'lucide-react';
import { buildAiSystemData, buildLearningContext } from './helpers';
import { createConversation, appendMessage } from '@/lib/supabase-db';
import type { AssistantProps } from '@/types/dashboard';

type Message = { role: string; text: string };

const SUGGESTION_CHIPS = [
  'How is my system performing right now?',
  'Should I charge the EVs now or wait?',
  'How can I reduce my KPLC bill?',
  "What's the battery health impact of V2G?",
  "Explain today's solar generation",
  'When is the best time to charge?',
  'How much CO\u2082 have I saved?',
  'Tips for Nairobi rainy season?',
];

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    text: "Hello! I'm **SafariCharge AI**, your intelligent energy advisor.\n\nI can help with your live dashboard data *and* answer broader questions using verified research when needed (not just your current simulation). Ask me anything! \u2600\ufe0f\ud83d\udd0b\ud83d\udcda",
  },
];

/** Render inline spans: **bold**, `code`, plain text */
function renderInline(raw: string): React.ReactNode[] {
  // Split on **bold** and `code` spans
  const tokens = raw.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={idx}
          style={{
            background: 'var(--bg-card-muted)',
            borderRadius: 3,
            padding: '0 4px',
            fontFamily: 'monospace',
            fontSize: '0.8em',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

export const AIMessageText = ({ text }: { text: string }) => {
  const lines = text.split('\n');

  type Block =
    | { type: 'blank' }
    | { type: 'heading'; level: number; content: string }
    | { type: 'hr' }
    | { type: 'bullet'; content: string }
    | { type: 'ordered'; content: string }
    | { type: 'para'; content: string };

  const blocks: Block[] = lines.map((line) => {
    if (!line.trim()) return { type: 'blank' };
    if (/^---+$/.test(line.trim())) return { type: 'hr' };
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) return { type: 'heading', level: 2, content: h2[1] };
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) return { type: 'heading', level: 3, content: h3[1] };
    const bullet = line.match(/^[-*]\s+(.*)/);
    if (bullet) return { type: 'bullet', content: bullet[1] };
    const ordered = line.match(/^\d+\.\s+(.*)/);
    if (ordered) return { type: 'ordered', content: ordered[1] };
    return { type: 'para', content: line };
  });

  // Group consecutive bullet/ordered lines into single list elements
  const grouped: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'blank') {
      grouped.push(<div key={i} className="h-1" />);
      i++;
    } else if (block.type === 'hr') {
      grouped.push(
        <hr key={i} style={{ borderColor: 'var(--border)', margin: '4px 0' }} />
      );
      i++;
    } else if (block.type === 'heading') {
      grouped.push(
        <p
          key={i}
          className="leading-relaxed"
          style={{
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
          }}
        >
          {renderInline(block.content)}
        </p>
      );
      i++;
    } else if (block.type === 'bullet') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'bullet') {
        items.push((blocks[i] as { type: 'bullet'; content: string }).content);
        i++;
      }
      grouped.push(
        <ul key={i} style={{ listStyle: 'disc', paddingLeft: 16, margin: 0 }}>
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed" style={{ color: 'inherit' }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    } else if (block.type === 'ordered') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'ordered') {
        items.push((blocks[i] as { type: 'ordered'; content: string }).content);
        i++;
      }
      grouped.push(
        <ol key={i} style={{ listStyle: 'decimal', paddingLeft: 16, margin: 0 }}>
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed" style={{ color: 'inherit' }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    } else {
      // para
      grouped.push(
        <p key={i} className="leading-relaxed" style={{ color: 'inherit' }}>
          {renderInline((block as { type: 'para'; content: string }).content)}
        </p>
      );
      i++;
    }
  }

  return <div className="space-y-1 ai-panel-message">{grouped}</div>;
};

export const SafariChargeAIAssistant = ({
  isOpen,
  onClose,
  data,
  timeOfDay,
  weather,
  currentDate,
  isAutoMode,
  minuteData,
  systemConfig,
}: AssistantProps) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessage = useRef<string>('');
  const conversationIdRef = useRef<string | null>(null);

  const systemSnapshot = useMemo(
    () =>
      buildAiSystemData({
        data,
        minuteData,
        timeOfDay,
        currentDate,
        systemConfig,
      }),
    [data, minuteData, timeOfDay, currentDate, systemConfig]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    lastUserMessage.current = text;
    setLastSentMessage(text);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInputText('');
    setIsTyping(true);
    setError(null);

    // Lazily create a Supabase conversation on the first user message
    if (!conversationIdRef.current) {
      void createConversation(text.slice(0, 60)).then((id) => {
        conversationIdRef.current = id;
      });
    }

    const conversationHistory = messages
      .slice(1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }));

    try {
      const res = await fetch('/api/safaricharge-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: text,
          conversationHistory,
          systemData: {
            ...systemSnapshot,
            learningContext: buildLearningContext(minuteData),
          },
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const payloadText = await res.text();
      let payload: { error?: string; response?: string } | null = null;
      if (contentType.includes('application/json')) {
        try {
          payload = JSON.parse(payloadText) as { error?: string; response?: string };
        } catch {
          throw new Error('AI service returned invalid JSON. Please try again.');
        }
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? `AI request failed with status ${res.status}`);
      }
      if (!payload?.response) {
        throw new Error('AI returned an unexpected response format.');
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: payload!.response! }]);

      // Persist both messages fire-and-forget once we have a conversation id
      if (conversationIdRef.current) {
        const convId = conversationIdRef.current;
        void appendMessage(convId, 'user', text, systemSnapshot);
        void appendMessage(convId, 'assistant', payload.response);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to reach SafariCharge AI. Check your connection.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "\u26a0\ufe0f I couldn't connect to the AI service right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => sendMessage(inputText);
  const handleChip = (chip: string) => sendMessage(chip);

  const learningCtx = useMemo(() => buildLearningContext(minuteData ?? []), [minuteData]);

  const latest = minuteData?.[minuteData.length - 1];
  const liveSolar   = data?.solar?.production_kw     ?? (data as any)?.solarR          ?? latest?.solarKW        ?? 0;
  const liveBattery = data?.battery?.current_charge  ?? (data as any)?.batteryLevel    ?? latest?.batteryLevelPct ?? 0;
  const liveNetGrid = data?.grid
    ? (data.grid.import_kwh - data.grid.export_kwh)
    : ((data as any)?.netGridPower ?? ((latest?.gridImportKW ?? 0) - (latest?.gridExportKW ?? 0)));
  const liveEv1V2g  = false;
  const liveEv2V2g  = false;

  const gridLabel = liveNetGrid > 0.1
    ? `Import ${liveNetGrid.toFixed(1)} kW`
    : liveNetGrid < -0.1
      ? `Export ${Math.abs(liveNetGrid).toFixed(1)} kW`
      : 'Grid balanced';

  const showChips = messages.length <= 2;

  return (
    <div
      className="fixed right-0 top-16 bottom-0 w-full md:w-96 shadow-2xl border-l z-[200] flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
      }}
      aria-hidden={!isOpen}
      aria-label="AI Assistant Panel"
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between shadow-sm flex-shrink-0"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            aria-hidden="true"
            style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)', color: 'var(--battery)' }}
          />
          <div>
            <h3
              className="font-bold text-sm leading-none"
              style={{ color: 'var(--text-primary)' }}
            >
              SafariCharge AI
            </h3>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Powered by live simulation data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-[10px] font-medium"
            style={{ color: 'var(--battery)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--battery)' }}
              aria-hidden="true"
            />
            {isAutoMode ? 'Live' : 'Paused'}
          </div>
          {/* Clear conversation button — only when there are user messages */}
          {messages.length > 1 && (
            <button
              onClick={() => { setMessages(INITIAL_MESSAGES); conversationIdRef.current = null; }}
              aria-label="Clear conversation"
              title="Clear conversation"
              className="rounded-md p-1.5 transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--alert)';
                e.currentTarget.style.background = 'var(--bg-card-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Trash2
                aria-hidden="true"
                style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }}
              />
            </button>
          )}
          {/* X close button */}
          <button
            onClick={onClose}
            aria-label="Close AI Assistant"
            className="rounded-md p-1.5 transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-card-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X
              aria-hidden="true"
              style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }}
            />
          </button>
        </div>
      </div>

      {/* Live status bar — single row, no wrapping */}
      <div
        className="px-4 py-2 flex-shrink-0"
        style={{
          background: 'var(--bg-card-muted)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: liveEv1V2g || liveEv2V2g ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
            gap: '4px',
          }}
        >
          <span
            className="flex items-center gap-1 text-[10px] font-mono whitespace-nowrap"
            style={{ color: 'var(--solar)' }}
          >
            &#9728;&#65039; {liveSolar.toFixed(1)} kW
          </span>
          <span
            className="flex items-center gap-1 text-[10px] font-mono whitespace-nowrap"
            style={{ color: 'var(--ev)' }}
          >
            &#128267; {liveBattery.toFixed(0)}%
          </span>
          <span
            className="flex items-center gap-1 text-[10px] font-mono whitespace-nowrap"
            style={{ color: liveNetGrid > 0.1 ? 'var(--alert)' : 'var(--consumption)' }}
          >
            &#9889; {gridLabel}
          </span>
          {(liveEv1V2g || liveEv2V2g) && (
            <span
              className="flex items-center gap-1 text-[10px] font-mono whitespace-nowrap"
              style={{ color: 'var(--warning)' }}
            >
              V2G&uarr;
            </span>
          )}
        </div>
        {/* Context data line — shown only when we have minute-level simulation data */}
        {(minuteData?.length ?? 0) > 0 && (
          <p
            className="text-[10px] font-mono mt-1"
            style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}
          >
            &#x1F4CA; {learningCtx.totalSimDays ?? 0} simulation day{(learningCtx.totalSimDays ?? 0) !== 1 ? 's' : ''} of context &middot; {learningCtx.dataConfidence ?? 'low'} confidence
          </p>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: 'var(--bg-primary)' }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <Sparkles
                  aria-hidden="true"
                  style={{
                    width: '12px',
                    height: '12px',
                    color: 'var(--battery)',
                  }}
                />
              </div>
            )}
            <div
              className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={
                msg.role === 'user'
                  ? {
                      background: 'var(--consumption)',
                      color: '#fff',
                    }
                  : {
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      position: 'relative',
                    }
              }
            >
              {msg.role === 'assistant' ? (
                <>
                  <AIMessageText text={msg.text} />
                  {/* Copy button — appears on hover via CSS group trick; using inline state */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text).catch(() => {});
                      setCopiedIdx(idx);
                      setTimeout(() => setCopiedIdx((prev) => (prev === idx ? null : prev)), 1500);
                    }}
                    aria-label="Copy message"
                    title="Copy message"
                    className="ai-copy-btn rounded p-0.5 transition-opacity"
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      opacity: copiedIdx === idx ? 1 : 0,
                      background: 'var(--bg-card-muted)',
                      border: '1px solid var(--border)',
                      color: copiedIdx === idx ? 'var(--battery)' : 'var(--text-tertiary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { if (copiedIdx !== idx) e.currentTarget.style.opacity = '0'; }}
                  >
                    {copiedIdx === idx ? (
                      <Check aria-hidden="true" style={{ width: '11px', height: '11px' }} />
                    ) : (
                      <Copy aria-hidden="true" style={{ width: '11px', height: '11px' }} />
                    )}
                  </button>
                </>
              ) : (
                <span className="text-sm leading-relaxed">{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <Sparkles
                aria-hidden="true"
                style={{ width: '12px', height: '12px', color: 'var(--battery)' }}
              />
            </div>
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: 'var(--text-tertiary)', animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: 'var(--text-tertiary)', animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: 'var(--text-tertiary)', animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        {showChips && !isTyping && (
          <div className="pt-2">
            <p
              className="text-[10px] font-mono mb-2 ml-8"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2 ml-8">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="ai-panel-chip px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80 active:scale-95"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--consumption)',
                    color: 'var(--consumption)',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="text-xs rounded-lg p-3 border break-words"
            style={{
              color: 'var(--alert)',
              background: 'var(--alert-soft)',
              borderColor: 'var(--alert)',
            }}
          >
            <p className="text-center mb-2">{error}</p>
            {lastSentMessage && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const msg = lastUserMessage.current;
                    if (msg) {
                      setError(null);
                      // Remove the error assistant message added on failure before retrying
                      setMessages((prev) => {
                        const lastAsst = [...prev].reverse().findIndex((m) => m.role === 'assistant');
                        if (lastAsst === -1) return prev;
                        const realIdx = prev.length - 1 - lastAsst;
                        return prev.filter((_, i) => i !== realIdx);
                      });
                      sendMessage(msg);
                    }
                  }}
                  className="px-3 py-1 rounded-full text-[10px] font-medium transition-opacity hover:opacity-80 active:scale-95"
                  style={{
                    background: 'var(--alert)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="p-3 flex gap-2 flex-shrink-0"
        style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your solar system..."
          disabled={isTyping}
          className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none disabled:opacity-60"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            minHeight: '40px',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className="p-2.5 rounded-full disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
          style={{
            background: 'var(--battery)',
            color: '#fff',
            minWidth: '40px',
            minHeight: '40px',
          }}
          aria-label="Send message"
        >
          <Send
            aria-hidden="true"
            style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }}
          />
        </button>
      </div>
    </div>
  );
};

export default SafariChargeAIAssistant;

'use client';
/**
 * AIAssistant/index.tsx
 * SafariChargeAIAssistant component + AIMessageText renderer.
 * Extracted from src/app/page.tsx — imports pure helpers from ./helpers.
 *
 * Usage in page.tsx:
 *   import { SafariChargeAIAssistant } from '@/components/dashboard/AIAssistant';
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { buildAiSystemData, buildLearningContext } from './helpers';
import type { AssistantProps } from '@/types/dashboard';

// ---------------------------------------------------------------------------
// Suggestion chips shown on first open
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AIMessageText — renders **bold** and newline formatting
// ---------------------------------------------------------------------------

export const AIMessageText = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SafariChargeAIAssistant
// ---------------------------------------------------------------------------

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
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([ 
    {
      role: 'assistant',
      text: "Hello! I'm **SafariCharge AI**, your intelligent energy advisor.\n\nI can help with your live dashboard data *and* answer broader questions using verified research when needed (not just your current simulation). Ask me anything! \u2600\ufe0f\ud83d\udd0b\ud83d\udcda",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [
    messages,
    isTyping,
  ]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInputText('');
    setIsTyping(true);
    setError(null);

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
    } catch (err: any) {
      setError(err.message || 'Failed to reach SafariCharge AI. Check your connection.');
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

  if (!isOpen) return null;

  const showChips = messages.length <= 2;

  // Derive live values — fall back to last minuteData record when data is null
  const latest = minuteData?.[minuteData.length - 1];
  const liveSolar   = data?.solarR        ?? latest?.solarKW        ?? 0;
  const liveBattery = data?.batteryLevel  ?? latest?.batteryLevelPct ?? 0;
  const liveNetGrid = data?.netGridPower  ?? ((latest?.gridImportKW ?? 0) - (latest?.gridExportKW ?? 0));
  const liveEv1V2g  = data?.ev1V2g       ?? false;
  const liveEv2V2g  = data?.ev2V2g       ?? false;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-full md:w-96 bg-[var(--bg-secondary)] shadow-2xl border-l border-[var(--border)] z-[200] flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-green-400" />
          <div>
            <h3 className="font-bold text-sm leading-none">SafariCharge AI</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Powered by live simulation data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-green-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {isAutoMode ? 'Live' : 'Paused'}
          </div>
          <button onClick={onClose} className="text-white hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Live status bar */}
      <div className="bg-slate-800 px-4 py-2 flex gap-4 text-[10px] font-mono text-slate-400 flex-shrink-0">
        <span className="text-green-400">☀️ {liveSolar.toFixed(1)}kW</span>
        <span className="text-purple-400">🔋 {liveBattery.toFixed(0)}%</span>
        <span
          className={
            liveNetGrid > 0.1 ? 'text-red-400' : 'text-sky-400'
          }
        >
          ⚡{' '}
          {liveNetGrid > 0.1
            ? `Import ${liveNetGrid.toFixed(1)}kW`
            : liveNetGrid < -0.1
              ? `Export ${Math.abs(liveNetGrid).toFixed(1)}kW`
              : 'Grid balanced'}
        </span>
        {(liveEv1V2g || liveEv2V2g) && (
          <span className="text-orange-400">V2G↑</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-primary)]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Sparkles size={12} className="text-green-400" />
              </div>
            )}
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-sky-500 text-white rounded-br-sm'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <AIMessageText text={msg.text} />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} className="text-green-400" />
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        {/* Suggestion chips: shown only at start */}
        {showChips && !isTyping && (
          <div className="pt-2">
            <p className="text-[10px] text-[var(--text-tertiary)] font-mono mb-2 ml-8">
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2 ml-8">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="text-[11px] bg-[var(--bg-card)] border border-[var(--consumption)] text-[var(--consumption)] px-3 py-1.5 rounded-full hover:opacity-80 transition-colors font-medium"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 text-center bg-red-50 rounded-lg p-3 border border-red-200 break-words">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your solar system..."
          disabled={isTyping}
          className="flex-1 bg-[var(--bg-card-muted)] text-[var(--text-primary)] rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-60 placeholder:text-[var(--text-tertiary)]"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className="p-2.5 bg-[var(--battery)] text-white rounded-full disabled:opacity-50 hover:opacity-90 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default SafariChargeAIAssistant;

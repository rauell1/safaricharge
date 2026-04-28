'use client';
/**
 * AIFloatingButton — persistent FAB that lives in the root layout.
 * Visible on every page. Clicking it opens the AI assistant panel.
 * When the panel is open the button hides itself to avoid overlap.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export function AIFloatingButton() {
  const { isOpen, toggleAI } = useAIAssistant();

  return (
    <button
      onClick={toggleAI}
      aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      aria-expanded={isOpen}
      className="fixed z-[190] flex items-center gap-2 shadow-lg transition-all"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
        right: '1.25rem',
        /* Slide away when panel is open so it doesn't stack on top */
        transform: isOpen ? 'translateX(calc(100% + 1.5rem))' : 'translateX(0)',
        opacity: isOpen ? 0 : 1,
        pointerEvents: isOpen ? 'none' : 'auto',
        transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
        background: 'var(--battery)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full, 9999px)',
        padding: '0.625rem 1rem',
        fontSize: 'clamp(0.75rem, 0.7rem + 0.3vw, 0.875rem)',
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.1) inset',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--battery-bright)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 6px 28px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.15) inset';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--battery)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 4px 20px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.1) inset';
      }}
    >
      <Sparkles aria-hidden="true" style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
      <span>Ask AI</span>
    </button>
  );
}

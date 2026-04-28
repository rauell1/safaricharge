'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

/**
 * AIFab — Floating Action Button that toggles the AI panel.
 * Visible only on desktop (md+). Mobile uses the bottom nav AI button.
 * Persists across all page navigations because it lives in DashboardLayout.
 */
export function AIFab() {
  const { isOpen, toggleAI } = useAIAssistant();

  return (
    <button
      type="button"
      onClick={toggleAI}
      aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      className="hidden md:flex fixed bottom-6 right-6 z-[199] items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: isOpen
          ? 'var(--bg-card)'
          : 'linear-gradient(135deg, var(--battery), var(--battery-bright))',
        color: isOpen ? 'var(--text-primary)' : '#fff',
        border: isOpen ? '1px solid var(--border)' : 'none',
        boxShadow: isOpen
          ? 'var(--card-shadow)'
          : '0 4px 20px color-mix(in srgb, var(--battery) 45%, transparent), 0 2px 8px rgba(0,0,0,0.22)',
        // Pulse glow animation only when closed (inviting the user to open)
        animation: isOpen ? 'none' : 'fab-pulse 2.8s ease-in-out infinite',
        focusRingColor: 'var(--battery)',
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: '20px',
          height: '20px',
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      >
        {isOpen ? (
          <X style={{ width: '18px', height: '18px' }} aria-hidden="true" />
        ) : (
          <Sparkles style={{ width: '18px', height: '18px' }} aria-hidden="true" />
        )}
      </span>
      <span>{isOpen ? 'Close AI' : 'AI Assistant'}</span>
    </button>
  );
}

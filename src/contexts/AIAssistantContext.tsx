'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AIAssistantContextType {
  isOpen: boolean;
  openAI: () => void;
  closeAI: () => void;
  toggleAI: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType>({
  isOpen: false,
  openAI: () => {},
  closeAI: () => {},
  toggleAI: () => {},
});

export function useAIAssistant() {
  return useContext(AIAssistantContext);
}

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openAI = useCallback(() => setIsOpen(true), []);
  const closeAI = useCallback(() => setIsOpen(false), []);
  const toggleAI = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <AIAssistantContext.Provider value={{ isOpen, openAI, closeAI, toggleAI }}>
      {children}
    </AIAssistantContext.Provider>
  );
}

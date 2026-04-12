'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({ onExport, label = 'Export', disabled }: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={disabled}
      className="flex items-center gap-2 text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}

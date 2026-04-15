'use client';

// Feature flag: ENABLE_GOVERNANCE_WIDGET
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

interface GovernanceWidgetProps {
  currentSoc?: number;
  minSoc?: number;
  maxSoc?: number;
  actualOutput?: number;
  expectedOutput?: number;
}

const CHECK_KEY = 'safaricharge-governance-checks-v1';

const DEFAULT_CHECKS = [
  { key: 'soc_limits', label: 'SoC limits configured' },
  { key: 'thermal_derating', label: 'Thermal derating thresholds set' },
  { key: 'grid_protection', label: 'Grid protection enabled' },
  { key: 'baseline_recorded', label: 'Performance baseline recorded' },
  { key: 'commissioning_signoff', label: 'Commissioning sign-off complete' },
] as const;

export function GovernanceWidget({
  currentSoc = 50,
  minSoc = 20,
  maxSoc = 90,
  actualOutput = 0,
  expectedOutput = 0,
}: GovernanceWidgetProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(CHECK_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CHECK_KEY, JSON.stringify(checks));
    } catch {
      // local storage not available
    }
  }, [checks]);

  const socCompliant = currentSoc >= minSoc && currentSoc <= maxSoc;
  const perfDeltaPct = expectedOutput <= 0 ? 0 : Math.abs(((actualOutput - expectedOutput) / expectedOutput) * 100);
  const performanceCompliant = perfDeltaPct <= 10;

  const complianceRows = useMemo(
    () => [
      {
        label: 'SoC limits respected',
        ok: socCompliant,
        meta: `${currentSoc.toFixed(0)}% (target ${minSoc}-${maxSoc}%)`,
      },
      {
        label: 'Performance thresholds met',
        ok: performanceCompliant,
        meta: `${perfDeltaPct.toFixed(1)}% deviation`,
      },
    ],
    [currentSoc, maxSoc, minSoc, perfDeltaPct, performanceCompliant, socCompliant]
  );

  return (
    <Card className="border border-[var(--border)] bg-[var(--bg-card)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <ShieldCheck className="h-4 w-4 text-[var(--battery)]" />
          Technical Governance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">ER Checklist</p>
          {DEFAULT_CHECKS.map((item) => {
            const checkboxId = `gov-check-${item.key}`;
            return (
            <label key={item.key} htmlFor={checkboxId} className="flex items-start gap-2 text-base text-[var(--text-secondary)]">
              <Checkbox
                id={checkboxId}
                checked={Boolean(checks[item.key])}
                onCheckedChange={(next) =>
                  setChecks((prev) => ({ ...prev, [item.key]: Boolean(next) }))
                }
              />
              <span>{item.label}</span>
            </label>
          );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Compliance indicators</p>
          {complianceRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-2">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{row.label}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{row.meta}</div>
              </div>
              <Badge className={row.ok ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}>
                {row.ok ? 'PASS' : 'CHECK'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

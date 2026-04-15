'use client';

// Feature flag: ENABLE_VALIDATION_PANEL
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type ValidationMetric = {
  metric: string;
  simulated: number;
  actual: number;
};

type ScenarioStatus = 'pass' | 'warning' | 'fail';

type CommissioningEvent = {
  id: string;
  timestamp: string;
  event_type: string;
  notes: string;
  created_by?: string | null;
};

interface ValidationPanelProps {
  metrics?: ValidationMetric[];
  stressScenarios?: { label: string; status: ScenarioStatus; detail: string }[];
}

const defaultMetrics: ValidationMetric[] = [
  { metric: 'Daily yield (kWh)', simulated: 118.2, actual: 112.6 },
  { metric: 'Performance ratio (%)', simulated: 82.4, actual: 78.7 },
  { metric: 'Battery throughput (kWh)', simulated: 46.1, actual: 44.9 },
];

const defaultStressScenarios = [
  { label: 'High Temp Scenario', status: 'warning' as const, detail: 'Minor clipping detected at inverter threshold.' },
  { label: 'Weak Grid Scenario', status: 'pass' as const, detail: 'Transfer logic remained stable in islanding transition.' },
  { label: 'Peak Load Scenario', status: 'fail' as const, detail: 'Grid import exceeded configured cap for 18 minutes.' },
];

const statusClass: Record<ScenarioStatus, string> = {
  pass: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  fail: 'text-red-600 bg-red-50',
};

export function ValidationPanel({
  metrics = defaultMetrics,
  stressScenarios = defaultStressScenarios,
}: ValidationPanelProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<CommissioningEvent[]>([]);
  const [eventType, setEventType] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return;
        }
        const response = await fetch(
          `${supabaseUrl}/rest/v1/commissioning_events?select=id,timestamp,event_type,notes,created_by&order=timestamp.desc&limit=20`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (!cancelled && response.ok) {
          const data = (await response.json()) as CommissioningEvent[];
          setEvents(data);
        }
      } catch {
        // fallback to local state
      }
    };
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const mergedEvents = useMemo(() => {
    if (events.length > 0) return events;
    return [
      { id: 'local-1', timestamp: new Date().toISOString(), event_type: 'Baseline Capture', notes: 'Initial baseline captured after commissioning run.' },
    ];
  }, [events]);

  const onAddEvent = async () => {
    if (!eventType.trim()) return;
    const entry: CommissioningEvent = {
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event_type: eventType.trim(),
      notes: notes.trim(),
    };
    setEvents((prev) => [entry, ...prev]);
    setEventType('');
    setNotes('');

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) return;
      await fetch(`${supabaseUrl}/rest/v1/commissioning_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          timestamp: entry.timestamp,
          event_type: entry.event_type,
          notes: entry.notes,
        }),
      });
    } catch {
      toast({
        title: 'Remote save failed',
        description: 'Event was kept locally, but could not be saved to Supabase.',
        variant: 'destructive',
      });
      // local fallback remains active
    }
  };

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-[var(--text-primary)]">Validation &amp; Testing (Controller-Hardware-in-the-Loop / PAT)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Simulated</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Deviation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((row) => {
                const deviation = row.simulated === 0 ? 0 : ((row.actual - row.simulated) / row.simulated) * 100;
                const deviationClass = Math.abs(deviation) <= 5 ? 'text-green-600' : Math.abs(deviation) <= 15 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <TableRow key={row.metric}>
                    <TableCell className="text-base">{row.metric}</TableCell>
                    <TableCell>{row.simulated.toFixed(2)}</TableCell>
                    <TableCell>{row.actual.toFixed(2)}</TableCell>
                    <TableCell className={deviationClass}>{deviation.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stressScenarios.map((scenario) => (
            <Card key={scenario.label} className="border border-[var(--border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{scenario.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge className={statusClass[scenario.status]}>{scenario.status.toUpperCase()}</Badge>
                <p className="text-base text-[var(--text-secondary)]">{scenario.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
          <h4 className="text-sm font-medium text-muted-foreground">Commissioning event log</h4>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Event type" className="md:max-w-xs" />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            <Button type="button" onClick={onAddEvent}>Add Event</Button>
          </div>
          <div className="space-y-2">
            {mergedEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <div className="text-sm font-medium text-[var(--text-primary)]">{event.event_type}</div>
                <div className="text-base text-[var(--text-secondary)]">{event.notes || 'No notes'}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{new Date(event.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import React from 'react';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PanelData {
  id: string;
  output: number;
  voltage: number;
  status: 'online' | 'warning' | 'offline';
  efficiency: number;
}

export interface PanelStatusTableProps {
  panels?: PanelData[];
  isLoading?: boolean;
}

const defaultPanels: PanelData[] = [
  { id: 'PNL-001', output: 385, voltage: 48.2, status: 'online', efficiency: 98 },
  { id: 'PNL-002', output: 392, voltage: 48.5, status: 'online', efficiency: 100 },
  { id: 'PNL-003', output: 378, voltage: 47.8, status: 'online', efficiency: 96 },
  { id: 'PNL-004', output: 410, voltage: 49.1, status: 'online', efficiency: 100 },
  { id: 'PNL-005', output: 295, voltage: 45.2, status: 'warning', efficiency: 75 },
  { id: 'PNL-006', output: 0, voltage: 0, status: 'offline', efficiency: 0 },
  { id: 'PNL-007', output: 388, voltage: 48.3, status: 'online', efficiency: 99 },
  { id: 'PNL-008', output: 405, voltage: 48.9, status: 'online', efficiency: 100 },
];

function StatusBadge({ status }: { status: 'online' | 'warning' | 'offline' }) {
  const config = {
    online: { icon: CheckCircle, label: 'Online', className: 'bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--border)]' },
    warning: { icon: AlertCircle, label: 'Warning', className: 'bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--border)]' },
    offline: { icon: AlertCircle, label: 'Offline', className: 'bg-[var(--alert-soft)] text-[var(--alert)] border-[var(--border)]' },
  };
  const { icon: Icon, label, className } = config[status];
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function EfficiencyBar({ value }: { value: number }) {
  const getColor = (e: number) => e >= 95 ? 'var(--battery)' : e >= 80 ? 'var(--solar)' : 'var(--alert)';
  if (value <= 0) return <span className="text-xs text-[var(--text-tertiary)]">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: getColor(value) }} />
        </div>
      </div>
      <span className="text-sm font-medium text-[var(--text-secondary)] w-10 text-right leading-relaxed">{value}%</span>
    </div>
  );
}

// Named export (preferred for all new imports)
export function PanelStatusTable({ panels = defaultPanels, isLoading }: PanelStatusTableProps) {
  const onlineCount = panels.filter(p => p.status === 'online').length;
  const warningCount = panels.filter(p => p.status === 'warning').length;
  const offlineCount = panels.filter(p => p.status === 'offline').length;

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="h-5 w-5 text-[var(--consumption)]" />
            Panel Status Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-[var(--bg-secondary)]" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <TableHead className="text-[var(--text-secondary)] font-semibold">Panel ID</TableHead>
                  <TableHead className="text-[var(--text-secondary)] font-semibold">Output (W)</TableHead>
                  <TableHead className="text-[var(--text-secondary)] font-semibold">Voltage (V)</TableHead>
                  <TableHead className="text-[var(--text-secondary)] font-semibold">Status</TableHead>
                  <TableHead className="text-[var(--text-secondary)] font-semibold">Efficiency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i} style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Skeleton className="h-2 flex-1" /><Skeleton className="h-4 w-10" /></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="h-5 w-5 text-[var(--consumption)]" />
            Panel Status Monitor
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[var(--battery)] status-online" />
              <span className="text-[var(--text-secondary)]">{onlineCount} Online</span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-[var(--solar)]" />
                <span className="text-[var(--text-secondary)]">{warningCount} Warning</span>
              </div>
            )}
            {offlineCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-[var(--alert)]" />
                <span className="text-[var(--text-secondary)]">{offlineCount} Offline</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-[var(--bg-secondary)]" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <TableHead className="text-[var(--text-secondary)] font-semibold">Panel ID</TableHead>
                <TableHead className="text-[var(--text-secondary)] font-semibold">Output (W)</TableHead>
                <TableHead className="text-[var(--text-secondary)] font-semibold">Voltage (V)</TableHead>
                <TableHead className="text-[var(--text-secondary)] font-semibold">Status</TableHead>
                <TableHead className="text-[var(--text-secondary)] font-semibold">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((panel) => (
                <TableRow key={panel.id} className="transition-colors hover:bg-[var(--bg-card-muted)]" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                  <TableCell className="font-mono text-sm text-[var(--text-primary)] font-medium">{panel.id}</TableCell>
                  <TableCell className="text-[var(--text-primary)]">
                    <span style={{ color: panel.output > 0 ? 'var(--battery)' : 'var(--text-tertiary)' }}>{panel.output > 0 ? panel.output.toFixed(0) : '—'}</span>
                  </TableCell>
                  <TableCell className="text-[var(--text-primary)]">{panel.voltage > 0 ? panel.voltage.toFixed(1) : '—'}</TableCell>
                  <TableCell><StatusBadge status={panel.status} /></TableCell>
                  <TableCell><EfficiencyBar value={panel.efficiency} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Default export alias — supports: import PanelStatusTable from '...'
export default PanelStatusTable;

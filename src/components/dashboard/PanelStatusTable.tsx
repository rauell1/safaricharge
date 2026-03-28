'use client';

import React from 'react';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PanelData {
  id: string;
  output: number;
  voltage: number;
  status: 'online' | 'warning' | 'offline';
  efficiency: number;
}

interface PanelStatusTableProps {
  panels?: PanelData[];
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
    online: {
      icon: CheckCircle,
      label: 'Online',
      className: 'bg-accent-energy-transparent text-accent-energy border-accent-energy/30'
    },
    warning: {
      icon: AlertCircle,
      label: 'Warning',
      className: 'bg-accent-solar-transparent text-accent-solar border-accent-solar/30'
    },
    offline: {
      icon: AlertCircle,
      label: 'Offline',
      className: 'bg-accent-alert-transparent text-accent-alert border-accent-alert/30'
    }
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
  const getColor = (efficiency: number) => {
    if (efficiency >= 95) return 'bg-accent-energy';
    if (efficiency >= 80) return 'bg-accent-solar';
    return 'bg-accent-alert';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="h-2 w-full rounded-full bg-dark-border overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-dark-text-secondary w-10 text-right">
        {value}%
      </span>
    </div>
  );
}

export function PanelStatusTable({ panels = defaultPanels }: PanelStatusTableProps) {
  const onlineCount = panels.filter(p => p.status === 'online').length;
  const warningCount = panels.filter(p => p.status === 'warning').length;
  const offlineCount = panels.filter(p => p.status === 'offline').length;

  return (
    <Card className="border-dark-border bg-secondary-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-dark-text-primary">
            <Activity className="h-5 w-5 text-accent-info" />
            Panel Status Monitor
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-accent-energy status-online" />
              <span className="text-dark-text-secondary">{onlineCount} Online</span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-accent-solar" />
                <span className="text-dark-text-secondary">{warningCount} Warning</span>
              </div>
            )}
            {offlineCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-accent-alert" />
                <span className="text-dark-text-secondary">{offlineCount} Offline</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dark-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-dark-border bg-primary-900 hover:bg-primary-900">
                <TableHead className="text-dark-text-secondary font-semibold">Panel ID</TableHead>
                <TableHead className="text-dark-text-secondary font-semibold">Output (W)</TableHead>
                <TableHead className="text-dark-text-secondary font-semibold">Voltage (V)</TableHead>
                <TableHead className="text-dark-text-secondary font-semibold">Status</TableHead>
                <TableHead className="text-dark-text-secondary font-semibold">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((panel) => (
                <TableRow
                  key={panel.id}
                  className="border-dark-border hover:bg-secondary-800 transition-colors"
                >
                  <TableCell className="font-mono text-sm text-dark-text-primary font-medium">
                    {panel.id}
                  </TableCell>
                  <TableCell className="text-dark-text-primary">
                    <span className={panel.output > 0 ? 'text-accent-energy' : 'text-dark-text-tertiary'}>
                      {panel.output.toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-dark-text-primary">
                    {panel.voltage.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={panel.status} />
                  </TableCell>
                  <TableCell>
                    <EfficiencyBar value={panel.efficiency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

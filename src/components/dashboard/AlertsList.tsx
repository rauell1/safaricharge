'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

interface AlertsListProps {
  alerts?: Alert[];
}

const defaultAlerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Panel Efficiency Low',
    message: 'Panel PNL-005 operating at 75% efficiency. Consider maintenance check.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15)
  },
  {
    id: '2',
    type: 'error',
    title: 'Panel Offline',
    message: 'Panel PNL-006 is offline. No power output detected.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: '3',
    type: 'info',
    title: 'High Solar Generation',
    message: 'Peak solar generation reached 48.5 kW at 12:30 PM.',
    timestamp: new Date(Date.now() - 1000 * 60 * 90)
  },
  {
    id: '4',
    type: 'success',
    title: 'Grid Export Active',
    message: 'Successfully exporting 12.3 kW to grid. Earning revenue.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120)
  },
];

function AlertIcon({ type }: { type: Alert['type'] }) {
  const config = {
    error: { icon: AlertCircle, color: 'var(--alert)' },
    warning: { icon: AlertTriangle, color: 'var(--solar)' },
    info: { icon: Info, color: 'var(--consumption)' },
    success: { icon: CheckCircle, color: 'var(--battery)' }
  };

  const { icon: Icon, color } = config[type];
  return <Icon className="h-5 w-5" style={{ color }} />;
}

function AlertTypeBadge({ type }: { type: Alert['type'] }) {
  const config = {
    error: { bg: 'var(--alert-soft)', color: 'var(--alert)' },
    warning: { bg: 'var(--solar-soft)', color: 'var(--solar)' },
    info: { bg: 'var(--consumption-soft)', color: 'var(--consumption)' },
    success: { bg: 'var(--battery-soft)', color: 'var(--battery)' }
  };

  const styles = config[type];

  return (
    <Badge
      variant="outline"
      className="text-xs border"
      style={{ backgroundColor: styles.bg, color: styles.color, borderColor: 'var(--border)' }}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleString();
}

export function AlertsList({ alerts = defaultAlerts }: AlertsListProps) {
  const errorCount = alerts.filter(a => a.type === 'error').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <AlertTriangle className="h-5 w-5 text-[var(--alert)]" />
            System Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge className="text-white border" style={{ backgroundColor: 'var(--alert)', borderColor: 'var(--border)' }}>
                {errorCount} Error{errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="text-primary border" style={{ backgroundColor: 'var(--solar)', borderColor: 'var(--border)' }}>
                {warningCount} Warning{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-[var(--battery)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                No active alerts. All systems operating normally.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-md cursor-default group"
                style={{ backgroundColor: 'var(--bg-card-muted)', borderColor: 'var(--border)' }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor:
                        alert.type === 'error' ? 'var(--alert-soft)' :
                        alert.type === 'warning' ? 'var(--solar-soft)' :
                        alert.type === 'info' ? 'var(--consumption-soft)' :
                        'var(--battery-soft)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    <AlertIcon type={alert.type} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {alert.title}
                    </h4>
                    <AlertTypeBadge type={alert.type} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

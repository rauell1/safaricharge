'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveAlerts, type LiveAlert } from '@/hooks/useLiveAlerts';

export type { LiveAlert as Alert };

interface AlertsListProps {
  isLoading?: boolean;
}

function AlertIcon({ type }: { type: LiveAlert['type'] }) {
  const config = {
    error:   { icon: AlertCircle,   color: 'var(--alert)'       },
    warning: { icon: AlertTriangle, color: 'var(--solar)'       },
    info:    { icon: Info,          color: 'var(--consumption)' },
    success: { icon: CheckCircle,   color: 'var(--battery)'     },
  };
  const { icon: Icon, color } = config[type];
  return <Icon className="h-5 w-5" style={{ color }} />;
}

function AlertTypeBadge({ type }: { type: LiveAlert['type'] }) {
  const config = {
    error:   { bg: 'var(--alert-soft)',       color: 'var(--alert)'       },
    warning: { bg: 'var(--solar-soft)',        color: 'var(--solar)'       },
    info:    { bg: 'var(--consumption-soft)', color: 'var(--consumption)' },
    success: { bg: 'var(--battery-soft)',     color: 'var(--battery)'     },
  };
  const styles = config[type];
  return (
    <Badge variant="outline" className="text-xs border" style={{ backgroundColor: styles.bg, color: styles.color, borderColor: 'var(--border)' }}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function formatTimestamp(date: Date): string {
  const now     = new Date();
  const diffMs  = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr  < 24) return `${diffHr}h ago`;
  return date.toLocaleString();
}

export function AlertsList({ isLoading }: AlertsListProps) {
  const alerts       = useLiveAlerts();
  const errorCount   = alerts.filter((a) => a.type === 'error').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <AlertTriangle className="h-5 w-5 text-[var(--alert)]" />
              System Alerts
            </CardTitle>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card-muted)', borderColor: 'var(--border)' }}>
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
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
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">All Systems Normal</p>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed prose-comfortable">No active alerts. All nodes are operating within expected parameters.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-md cursor-default"
                style={{ backgroundColor: 'var(--bg-card-muted)', borderColor: 'var(--border)' }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: alert.type === 'error' ? 'var(--alert-soft)' : alert.type === 'warning' ? 'var(--solar-soft)' : alert.type === 'info' ? 'var(--consumption-soft)' : 'var(--battery-soft)', borderColor: 'var(--border)' }}>
                    <AlertIcon type={alert.type} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{alert.title}</h4>
                    <div className="flex items-center gap-1.5">
                      {alert.predictive && (
                        <Badge className="text-yellow-600 bg-yellow-50 border-yellow-200">⚡ Predicted</Badge>
                      )}
                      <AlertTypeBadge type={alert.type} />
                    </div>
                  </div>
                  <p className="text-base text-[var(--text-secondary)] mb-2 leading-relaxed prose-comfortable">{alert.message}</p>
                  {alert.context && (
                    <p className="text-base text-[var(--text-tertiary)] mb-2 leading-relaxed">{alert.context}</p>
                  )}
                  <span className="text-[10px] text-[var(--text-tertiary)]">{formatTimestamp(alert.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

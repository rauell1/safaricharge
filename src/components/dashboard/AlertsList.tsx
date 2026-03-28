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
    error: { icon: AlertCircle, className: 'text-accent-alert' },
    warning: { icon: AlertTriangle, className: 'text-accent-solar' },
    info: { icon: Info, className: 'text-accent-info' },
    success: { icon: CheckCircle, className: 'text-accent-energy' }
  };

  const { icon: Icon, className } = config[type];
  return <Icon className={`h-5 w-5 ${className}`} />;
}

function AlertTypeBadge({ type }: { type: Alert['type'] }) {
  const config = {
    error: 'bg-accent-alert-transparent text-accent-alert border-accent-alert/30',
    warning: 'bg-accent-solar-transparent text-accent-solar border-accent-solar/30',
    info: 'bg-accent-info-transparent text-accent-info border-accent-info/30',
    success: 'bg-accent-energy-transparent text-accent-energy border-accent-energy/30'
  };

  return (
    <Badge variant="outline" className={`text-xs ${config[type]}`}>
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
    <Card className="border-dark-border bg-secondary-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-dark-text-primary">
            <AlertTriangle className="h-5 w-5 text-accent-alert" />
            System Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge className="bg-accent-alert text-white">
                {errorCount} Error{errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-accent-solar text-primary">
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
              <CheckCircle className="h-12 w-12 text-accent-energy mb-3" />
              <p className="text-sm text-dark-text-secondary">
                No active alerts. All systems operating normally.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-xl border border-dark-border bg-primary p-4 transition-all duration-200 hover:scale-[1.02] hover:border-dark-border/60 hover:bg-secondary-900 cursor-default group"
              >
                <div className="mt-0.5 flex-shrink-0">
                  <AlertIcon type={alert.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-dark-text-primary">
                      {alert.title}
                    </h4>
                    <AlertTypeBadge type={alert.type} />
                  </div>
                  <p className="text-xs text-dark-text-secondary mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-dark-text-tertiary">
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

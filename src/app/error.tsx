'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
        <div className="text-center">
          <p className="text-sm font-semibold text-destructive">Something went wrong</p>
          <h1 className="mt-2 text-3xl font-bold">SafariCharge Dashboard Error</h1>
          <p className="mt-2 text-muted-foreground">
            We hit an unexpected issue. The action was not completed.
          </p>
          {error?.digest ? (
            <p className="mt-2 text-xs text-muted-foreground">Error code: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Button variant="default" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Back to dashboard
          </Button>
        </div>
      </body>
    </html>
  );
}

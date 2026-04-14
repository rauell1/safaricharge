'use client';

// Stub — replace with the real dashboard implementation that was
// previously the default export of src/app/page.tsx before the
// landing/login refactor. The simulation page imports this via
// src/app/dashboard-app.tsx.

export default function SafariChargeDashboardApp({
  initialSection,
}: {
  initialSection?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">
        Loading section: {initialSection ?? 'home'}…
      </p>
    </div>
  );
}

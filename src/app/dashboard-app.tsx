'use client';

// This file re-exports the main dashboard component so sub-routes
// (e.g. /simulation) can import it without touching src/app/page.tsx,
// which is now a server-side redirect component.

export { default as SafariChargeDashboardApp } from './dashboard-app-impl';

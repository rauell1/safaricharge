import { SolarComponentLibrary } from '@/components/SolarComponentLibrary';
import { BrandDocsHub } from '@/components/BrandDocsHub';

export default function ComponentKnowledgeBasePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.1),_transparent_32%),linear-gradient(to_bottom,_rgba(10,15,30,1),_rgba(15,23,42,0.98))] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        {/* Page header */}
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] px-5 py-5 sm:px-6 sm:py-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Component Knowledge Base</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Browse the full component catalog, review detailed specs, and access official documentation
            for every Tier 1 brand — all sourced directly from manufacturer download centres.
          </p>
        </div>

        {/* Brand Documentation Hub */}
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] px-5 py-6 sm:px-8 sm:py-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          <BrandDocsHub />
        </div>

        {/* Full component catalog (existing) */}
        <SolarComponentLibrary standalone />
      </div>
    </main>
  );
}

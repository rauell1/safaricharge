import { SolarComponentLibrary } from '@/components/SolarComponentLibrary';

export default function ComponentKnowledgeBasePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-main)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Component Knowledge Base</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Dedicated page for component browsing, clearer UI readability, and backend uploads for catalog/spec documents.
        </p>
        <SolarComponentLibrary standalone />
      </div>
    </main>
  );
}

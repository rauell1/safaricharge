export default function RootLoading() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--battery)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Opening page...</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Loading dashboard modules and data. This should only take a moment.
        </p>
      </div>
    </main>
  );
}

// apps/web/src/components/LoadingScreen.tsx
export default function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      role="status"
      aria-live="polite"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

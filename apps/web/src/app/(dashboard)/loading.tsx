export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Loading your workspace...</p>
      </div>
    </div>
  );
}

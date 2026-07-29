export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-80 border-r bg-muted/30 p-4 space-y-3">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container py-6">
      <div className="h-7 w-40 bg-muted rounded animate-pulse mb-1" />
      <div className="h-4 w-24 bg-muted rounded animate-pulse mb-6" />
      <div className="border rounded-2xl overflow-hidden">
        <div className="h-10 bg-muted/50" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-14 border-t bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

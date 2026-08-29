export default function Loading() {
  return (
    <div className="container py-6">
      <div className="h-7 w-40 bg-bg-overlay-l1 rounded animate-pulse mb-1" />
      <div className="h-4 w-24 bg-bg-overlay-l1 rounded animate-pulse mb-6" />
      <div className="h-10 w-80 bg-bg-overlay-l1 rounded animate-pulse mb-4" />
      <div className="border rounded-2xl overflow-hidden">
        <div className="h-10 bg-bg-overlay-l1/50" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-14 border-t bg-bg-overlay-l1/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

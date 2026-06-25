const SkeletonLoader = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-muted rounded animate-pulse-subtle flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;

export function SkeletonCard({ height = 260 }: { height?: number }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E6E3DC",
        borderRadius: "24px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: `${height}px`,
        boxSizing: "border-box",
      }}
    >
      <div
        className="wf-skeleton"
        style={{
          width: "100%",
          height: `${height * 0.55}px`,
          borderRadius: "16px",
        }}
      />
      <div
        className="wf-skeleton"
        style={{
          width: "40%",
          height: "18px",
          borderRadius: "999px",
        }}
      />
      <div
        className="wf-skeleton"
        style={{
          width: "85%",
          height: "22px",
          borderRadius: "8px",
        }}
      />
      <div
        className="wf-skeleton"
        style={{
          width: "60%",
          height: "16px",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}

export function SkeletonGrid({ count = 6, height = 260 }: { count?: number; height?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "20px",
        width: "100%",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </div>
  );
}

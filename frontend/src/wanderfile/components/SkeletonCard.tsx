export function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--wf-surface)",
        border: "1px solid var(--wf-border)",
        borderRadius: "var(--wf-radius-card)",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "var(--wf-shadow-card)",
        boxSizing: "border-box",
      }}
    >
      <div
        className="wf-skeleton"
        style={{
          width: "100%",
          aspectRatio: "4 / 5",
          borderRadius: "var(--wf-radius-control)",
        }}
      />
      <div
        className="wf-skeleton"
        style={{
          width: "35%",
          height: "16px",
          borderRadius: "var(--wf-radius-pill)",
          marginTop: "4px",
        }}
      />
      <div
        className="wf-skeleton"
        style={{
          width: "85%",
          height: "20px",
          borderRadius: "6px",
        }}
      />
      <div
        className="wf-skeleton"
        style={{
          width: "55%",
          height: "14px",
          borderRadius: "6px",
        }}
      />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="wf-responsive-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

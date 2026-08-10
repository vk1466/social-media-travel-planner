import "../page-chrome.css";

export interface PageMetricProps {
  value: number | string;
  label: string;
}

/** Big-number stat for a PageHeader aside — light twin of .wf-browse-count. */
export function PageMetric({ value, label }: PageMetricProps) {
  return (
    <div className="wf-metric">
      <span className="wf-metric-value">{value}</span>
      <span className="wf-metric-label">{label}</span>
    </div>
  );
}

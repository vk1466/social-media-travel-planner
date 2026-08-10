/** 18px line icons for SectionPanel heads. Stroke follows currentColor. */

const SIZE = 18;

export function LinkIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 18 18">
      <path
        d="M7.5 10.5 3 6m0 0 4.5-4.5M3 6h8.5a4 4 0 0 1 0 8H11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ApertureIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 18 18">
      <path
        d="M3 14.5V3.5h7.2L15 8.3v6.2H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 3.5V8h4.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 18 18">
      <path
        d="M9 2.5C6.5 2.5 4.5 4.5 4.5 7c0 4 4.5 8 4.5 8s4.5-4 4.5-8c0-2.5-2-4.5-4.5-4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="9" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function ReviewIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7 6.6a2 2 0 1 1 2.6 2.3c-.4.15-.6.5-.6.95v.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="9" cy="12.5" r="0.85" fill="currentColor" />
    </svg>
  );
}

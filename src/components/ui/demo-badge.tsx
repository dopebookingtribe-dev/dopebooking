/** Marks sample records so visitors don't mistake them for real bookings. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-uv/60 bg-bg/80 px-2.5 py-0.5 font-label text-xs text-uv backdrop-blur-sm ${className}`}
      title="Sample content to show the layout"
    >
      Demo
    </span>
  );
}

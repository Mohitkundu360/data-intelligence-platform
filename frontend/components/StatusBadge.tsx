const styles: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  running: "border-blue-200 bg-accent-soft text-accent",
  pending: "border-line bg-paper text-muted",
  failed: "border-red-200 bg-red-50 text-red-800",
};

const labels: Record<string, string> = {
  completed: "Completed",
  running: "Running",
  pending: "Pending",
  failed: "Failed",
};

const icons: Record<string, string> = {
  completed: "✓",
  running: "●",
  pending: "○",
  failed: "!",
};

export default function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const style = styles[normalized] ?? styles.pending;
  const label = labels[normalized] ?? status;
  const icon = icons[normalized] ?? "○";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style}`}
    >
      <span
        aria-hidden="true"
        className={normalized === "running" ? "animate-pulse" : ""}
      >
        {icon}
      </span>
      {label}
    </span>
  );
}
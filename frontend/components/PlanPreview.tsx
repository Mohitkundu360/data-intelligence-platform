import type { WorkflowPlan } from "@/lib/types";

export default function PlanPreview(props: {
  plan: WorkflowPlan;
  busy: boolean;
  onRun: () => void;
  onEdit: () => void;
}) {
  const { plan, busy, onRun, onEdit } = props;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
      aria-label="Collection plan"
    >
      {/* Header */}
      <div className="border-b border-line bg-paper px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
                2
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Review plan
              </p>
            </div>

            <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
              Here is what I will collect
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              {plan.objective}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
            Ready to run
          </span>
        </div>
      </div>

      {/* Plan details */}
      <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* Target */}
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Target
          </p>

          <p className="mt-3 text-lg font-semibold text-ink">
            {plan.target_count
              ? `${plan.target_count} records`
              : "As many as found"}
          </p>

          {plan.filters.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Filters
              </p>

              <ul className="mt-2 space-y-2">
                {plan.filters.map((f, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  >
                    <span className="font-mono font-medium text-accent">
                      {f.field}
                    </span>{" "}
                    <span className="text-muted">
                      {f.operator.replaceAll("_", " ")}
                    </span>{" "}
                    <span className="font-medium text-ink">{f.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No additional filters specified.
            </p>
          )}
        </div>

        {/* Fields */}
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Dataset fields
          </p>

          <div className="mt-3 space-y-2">
            {plan.fields.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2"
              >
                <span className="font-mono text-xs font-medium text-ink">
                  {field.name}
                </span>

                <span
                  className={
                    field.required
                      ? "text-[11px] font-medium text-accent"
                      : "text-[11px] text-muted"
                  }
                >
                  {field.required ? "required" : "optional"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sources */}
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Search strategy
          </p>

          <p className="mt-1 text-xs text-muted">
            {plan.sources.length} search{" "}
            {plan.sources.length === 1 ? "query" : "queries"}
          </p>

          <ul className="mt-3 space-y-2">
            {plan.sources.map((source, i) => (
              <li
                key={i}
                className="rounded-lg border border-line bg-paper px-3 py-2"
              >
                <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                  {source.type}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-ink">
                  {source.query}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs leading-5 text-muted">
          Nothing runs until you start the collection.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={busy}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit request
          </button>

          <button
            onClick={onRun}
            disabled={busy}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Starting..." : "Run collection →"}
          </button>
        </div>
      </div>
    </section>
  );
}
import type { Step } from "@/lib/types";
import StatusBadge from "./StatusBadge";

const LABELS: Record<string, string> = {
  discover: "Discover sources",
  collect: "Collect pages",
  extract: "Extract records",
  normalize: "Normalize records",
  validate: "Validate records",
  deduplicate: "Remove duplicates",
  verify: "Verify evidence",
  persist: "Save dataset",
};

const DESCRIPTIONS: Record<string, string> = {
  discover: "Find relevant permitted sources",
  collect: "Fetch and process source pages",
  extract: "Identify structured records from pages",
  normalize: "Standardize collected values",
  validate: "Check records against required fields",
  deduplicate: "Remove duplicate records",
  verify: "Check values against source evidence",
  persist: "Save the final dataset",
};

function metrics(output: Step["output"]) {
  return Object.entries(output ?? {}).filter(
    ([, value]) => typeof value === "number"
  ) as [string, number][];
}

function formatMetric(key: string) {
  return key.replaceAll("_", " ");
}

function StepIcon({
  status,
  index,
}: {
  status: Step["status"];
  index: number;
}) {
  if (status === "completed") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
        ✓
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-soft">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
        !
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xs font-medium text-muted">
      {index + 1}
    </span>
  );
}

export default function StepTimeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const stepMetrics = metrics(step.output);
        const isLast = index === steps.length - 1;
        const description =
          DESCRIPTIONS[step.type] ?? "Processing workflow stage";

        return (
          <li key={step.id} className="relative flex gap-4">
            {/* Connector */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-4 top-8 h-[calc(100%-16px)] w-px ${
                  step.status === "completed" ? "bg-accent" : "bg-line"
                }`}
              />
            )}

            {/* Icon */}
            <StepIcon status={step.status} index={index} />

            {/* Content */}
            <div className={`min-w-0 flex-1 ${isLast ? "pb-1" : "pb-6"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {LABELS[step.type] ?? step.type}
                    </h3>

                    <StatusBadge status={step.status} />
                  </div>

                  <p className="mt-1 text-xs text-muted">{description}</p>
                </div>

                {stepMetrics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {stepMetrics.map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-muted"
                      >
                        {formatMetric(key)}{" "}
                        <strong className="font-semibold text-ink">
                          {value}
                        </strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {step.error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-medium text-red-900">
                    Stage failed
                  </p>
                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {step.error}
                  </p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
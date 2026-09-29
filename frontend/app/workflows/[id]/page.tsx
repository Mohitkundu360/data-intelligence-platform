"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import RecordsTable from "@/components/RecordsTable";
import StatusBadge from "@/components/StatusBadge";
import StepTimeline from "@/components/StepTimeline";
import { api, BASE } from "@/lib/api";
import type { Workflow } from "@/lib/types";

export default function WorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const [wf, setWf] = useState<Workflow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const w = await api.getWorkflow(id);

        if (stop) return;

        setWf(w);

        if (w.status === "pending" || w.status === "running") {
          timer = setTimeout(tick, 2000);
        }
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
    };

    tick();

    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-900">
          Unable to load workflow
        </p>
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-red-800 underline"
        >
          Return home
        </Link>
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-line" />
        <div className="h-8 w-64 animate-pulse rounded bg-line" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-line" />
        <div className="h-24 animate-pulse rounded-xl bg-line" />
      </div>
    );
  }

  const completed = wf.steps.filter(
    (step) => step.status === "completed"
  ).length;

  const failed = wf.steps.filter(
    (step) => step.status === "failed"
  ).length;

  const total = wf.steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const isActive = wf.status === "pending" || wf.status === "running";
  const isComplete = wf.status === "completed";
  const isFailed = wf.status === "failed";

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        ← All workflows
      </Link>

      {/* Header */}
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-accent-soft px-2 py-1 font-mono text-xs font-medium text-accent">
                WORKFLOW #{wf.id}
              </span>

              <StatusBadge status={wf.status} />
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {isComplete
                ? "Dataset ready"
                : isFailed
                  ? "Workflow stopped"
                  : "Building your dataset"}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {wf.plan.objective}
            </p>
          </div>

          {isComplete && (
            <div className="shrink-0 rounded-xl border border-line bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-2xl font-semibold text-ink">
                {wf.record_count}
              </p>
              <p className="text-xs text-muted">
                {wf.record_count === 1 ? "record" : "records"}
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mt-6 max-w-3xl">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-ink">
              {isComplete
                ? "Collection complete"
                : isFailed
                  ? "Collection interrupted"
                  : "Collection in progress"}
            </span>

            <span className="text-muted">
              {completed}/{total} steps · {pct}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Metrics */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Pipeline steps
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {completed}
            <span className="text-base font-normal text-muted">
              {" "}
              / {total}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {failed > 0
              ? `${failed} step${failed === 1 ? "" : "s"} failed`
              : isComplete
                ? "All steps completed"
                : "Processing"}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Records
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {wf.record_count}
          </p>
          <p className="mt-1 text-xs text-muted">
            {isComplete ? "Ready for review" : "Currently collected"}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Data integrity
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {isComplete ? "Verified" : "Checking"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Evidence is retained for collected values
          </p>
        </div>
      </section>

      {/* Failure */}
      {isFailed && wf.error && (
        <section
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm font-semibold text-red-900">
            The workflow stopped
          </p>
          <p className="mt-1 text-sm leading-6 text-red-800">{wf.error}</p>
        </section>
      )}

      {/* Pipeline */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Pipeline
          </p>
          <h2 className="mt-1 text-lg font-semibold">Collection progress</h2>
          <p className="mt-1 text-sm text-muted">
            Every stage is tracked before records enter the final dataset.
          </p>
        </div>

        <StepTimeline steps={wf.steps} />
      </section>

      {/* Dataset */}
      {isComplete && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Output
              </p>
              <h2 className="mt-1 text-xl font-semibold">Verified dataset</h2>
              <p className="mt-1 text-sm text-muted">
                Review the collected records and inspect their supporting
                evidence.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper"
                href={`${BASE}/api/workflows/${wf.id}/export.csv`}
              >
                Export CSV
              </a>

              <a
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
                href={`${BASE}/api/workflows/${wf.id}/export.json`}
              >
                Export JSON
              </a>
            </div>
          </div>

          <RecordsTable
            workflowId={wf.id}
            fields={wf.plan.fields}
          />
        </section>
      )}

      {/* Active state */}
      {isActive && (
        <div className="rounded-xl border border-accent/20 bg-accent-soft p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 animate-pulse rounded-full bg-accent" />
            <div>
              <p className="text-sm font-medium text-ink">
                Your dataset is being built
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                This page updates automatically every few seconds. You can
                leave it open while the collection pipeline runs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
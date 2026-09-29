"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PlanPreview from "@/components/PlanPreview";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { Workflow, WorkflowPlan } from "@/lib/types";

const EXAMPLES = [
  "Find AI startups in India with company name, website, and description",
  "Find Indian software companies hiring backend engineers with role and application link",
  "Find SaaS companies in India with company name, website, industry, and funding",
];

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<WorkflowPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Workflow[]>([]);

  useEffect(() => {
    api.listWorkflows().then(setRecent).catch(() => {});
  }, []);

  async function preview() {
    if (!prompt.trim()) return;

    setBusy(true);
    setError("");

    try {
      setPlan((await api.previewPlan(prompt)).plan);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!plan) return;

    setBusy(true);
    setError("");

    try {
      const workflow = await api.createWorkflow(prompt, plan);
      router.push(`/workflows/${workflow.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function chooseExample(example: string) {
    setPrompt(example);
    setPlan(null);
    setError("");
  }

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="pt-6 text-center">
        <div className="mx-auto inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted shadow-sm">
          AI-powered data collection
        </div>

        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Turn a question into a{" "}
          <span className="text-accent">verified dataset.</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
          Describe the data you need in plain English. The platform plans the
          collection, gathers permitted web sources, validates the results,
          and keeps evidence for every value.
        </p>
      </section>

      {/* Prompt */}
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                What data do you need?
              </h2>
              <p className="mt-1 text-xs text-muted">
                Start with a natural-language request.
              </p>
            </div>

            <span className="hidden rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent sm:inline-block">
              Step 1 · Describe
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setPlan(null);
              setError("");
            }}
            rows={5}
            aria-label="Data request"
            placeholder="Example: Find 100 software companies in India hiring backend engineers, with role, location, salary if available, and application link"
            className="mt-5 w-full resize-none rounded-xl border border-line bg-paper p-4 text-sm leading-6 text-ink placeholder:text-muted/70 focus:border-accent focus:bg-white focus:outline-none"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              You will review the collection plan before anything runs.
            </p>

            <button
              onClick={preview}
              disabled={busy || !prompt.trim()}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && !plan ? "Planning..." : "Preview plan →"}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}
        </div>

        {/* Examples */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Try an example
          </p>

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => chooseExample(example)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plan */}
      {plan && (
        <section className="mx-auto max-w-5xl">
          <PlanPreview
            plan={plan}
            busy={busy}
            onRun={run}
            onEdit={() => setPlan(null)}
          />
        </section>
      )}

      {/* How it works */}
      {!plan && (
        <section className="mx-auto max-w-5xl">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                01
              </div>
              <h3 className="mt-3 font-semibold">Describe</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Tell the platform what information you want to collect.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                02
              </div>
              <h3 className="mt-3 font-semibold">Collect & verify</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Sources are discovered, data is extracted, validated, and
                checked against evidence.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                03
              </div>
              <h3 className="mt-3 font-semibold">Use the dataset</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Review records, inspect their sources, and export the result
                as CSV or JSON.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Recent workflows */}
      <section className="mx-auto max-w-5xl pb-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent workflows</h2>
            <p className="mt-1 text-sm text-muted">
              Your previous data collection runs.
            </p>
          </div>

          {recent.length > 0 && (
            <span className="text-xs text-muted">
              {recent.length} workflow{recent.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium">No workflows yet</p>
            <p className="mt-1 text-sm text-muted">
              Describe a dataset above to start your first collection.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {recent.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/workflows/${w.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-white px-4 py-4 transition hover:border-accent hover:shadow-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-mono text-xs font-medium text-accent">
                    #{w.id}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {w.plan.objective}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {w.record_count}{" "}
                      {w.record_count === 1 ? "record" : "records"}
                    </span>
                  </span>

                  <StatusBadge status={w.status} />

                  <span className="hidden text-muted transition group-hover:translate-x-0.5 sm:block">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
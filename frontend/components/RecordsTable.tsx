"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Evidence, FieldSpec, RecordRow } from "@/lib/types";

const CONF: Record<string, string> = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-red-200 bg-red-50 text-red-800",
};

function formatFieldName(name: string) {
  return name.replaceAll("_", " ");
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function RecordsTable({
  workflowId,
  fields,
}: {
  workflowId: number;
  fields: FieldSpec[];
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState<{
    row: RecordRow;
    evidence: Evidence[];
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);

      api
        .records(workflowId, q)
        .then((r) => {
          setRows(r.items);
          setTotal(r.total);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [workflowId, q]);

  async function showSource(row: RecordRow) {
    try {
      setError("");
      setOpen({
        row,
        evidence: await api.evidence(row.id),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section aria-label="Dataset">
      {/* Table toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          >
            ⌕
          </span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search records..."
            aria-label="Search records"
            className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          {loading && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Searching
            </span>
          )}

          <span>
            <strong className="font-semibold text-ink">{total}</strong>{" "}
            {total === 1 ? "record" : "records"}
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Dataset table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th className="w-14 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  #
                </th>

                {fields.map((field) => (
                  <th
                    key={field.name}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    {formatFieldName(field.name)}
                  </th>
                ))}

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Confidence
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Evidence
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="group transition hover:bg-paper/70"
                >
                  <td className="px-4 py-4 align-top font-mono text-xs text-muted">
                    {index + 1}
                  </td>

                  {fields.map((field) => {
                    const value = row.data[field.name];

                    return (
                      <td
                        key={field.name}
                        className="max-w-xs px-4 py-4 align-top text-sm text-ink"
                      >
                        {value ? (
                          <span className="line-clamp-3">{value}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-4 py-4 align-top">
                    <div className="space-y-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          CONF[row.confidence_label] ??
                          "border-line bg-paper text-muted"
                        }`}
                      >
                        {row.confidence_label}
                      </span>

                      <p className="text-xs text-muted">
                        {formatConfidence(row.confidence)}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <button
                      onClick={() => showSource(row)}
                      className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-accent transition hover:border-accent hover:bg-accent-soft"
                    >
                      View source →
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={fields.length + 3}
                    className="px-6 py-12 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-paper text-muted">
                        {q ? "⌕" : "∅"}
                      </div>

                      <p className="mt-3 text-sm font-medium text-ink">
                        {q
                          ? "No matching records"
                          : "No records available"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted">
                        {q
                          ? "Try a different search term."
                          : "Records will appear here once the workflow produces a dataset."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="border-t border-line bg-paper px-4 py-2.5 text-xs text-muted">
            Showing {rows.length} of {total}{" "}
            {total === 1 ? "record" : "records"} · Click{" "}
            <span className="font-medium text-accent">View source</span> to
            inspect supporting evidence.
          </div>
        )}
      </div>

      {/* Evidence drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(null)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Evidence"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-line bg-white shadow-2xl"
          >
            {/* Drawer header */}
            <div className="sticky top-0 z-10 border-b border-line bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Evidence
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    Where these values came from
                  </h2>

                  <p className="mt-1 text-xs text-muted">
                    Record #{open.row.id} ·{" "}
                    <span className="capitalize">
                      {open.row.confidence_label} confidence
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setOpen(null)}
                  aria-label="Close evidence"
                  className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition hover:bg-paper hover:text-ink"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Record preview */}
            <div className="border-b border-line bg-paper px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Record
              </p>

              <div className="mt-3 space-y-2">
                {Object.entries(open.row.data).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[120px_1fr] gap-3 text-xs"
                  >
                    <span className="font-mono text-muted">
                      {formatFieldName(key)}
                    </span>
                    <span className="font-medium text-ink">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div className="px-5 py-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Source trail
                </p>
                <p className="mt-1 text-xs text-muted">
                  Exact evidence retained for each extracted field.
                </p>
              </div>

              <ul className="space-y-4">
                {open.evidence.map((e, index) => (
                  <li
                    key={`${e.field_name}-${index}`}
                    className="rounded-xl border border-line bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-medium text-ink">
                        {e.field_name}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          e.verified
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {e.verified ? "✓ Verified" : "Needs review"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-ink">
                      {e.value || "—"}
                    </p>

                    <div className="mt-3 rounded-lg bg-paper p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Evidence quote
                      </p>

                      <blockquote className="border-l-2 border-accent pl-3 font-mono text-xs leading-5 text-muted">
                        “{e.evidence_text}”
                      </blockquote>
                    </div>

                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Source
                      </p>

                      {e.source_url.startsWith("http") ? (
                        <a
                          href={e.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-xs font-medium text-accent underline underline-offset-2"
                        >
                          {e.source_title || e.source_url}
                        </a>
                      ) : (
                        <p className="mt-1 break-all text-xs text-ink">
                          {e.source_url}
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-muted">
                        Retrieved{" "}
                        {new Date(e.retrieved_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {open.evidence.length === 0 && (
                <div className="rounded-xl border border-dashed border-line p-6 text-center">
                  <p className="text-sm font-medium text-ink">
                    No evidence available
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    This record does not currently have supporting evidence.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
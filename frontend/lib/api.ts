import type { Evidence, RecordRow, Workflow, WorkflowPlan } from "./types";

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const b = await res.json(); if (typeof b.detail === "string") msg = b.detail; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  previewPlan: (prompt: string) =>
    req<{ plan: WorkflowPlan }>("/api/plans", { method: "POST", body: JSON.stringify({ prompt }) }),
  createWorkflow: (prompt: string, plan: WorkflowPlan) =>
    req<Workflow>("/api/workflows", { method: "POST", body: JSON.stringify({ prompt, plan }) }),
  listWorkflows: () => req<Workflow[]>("/api/workflows"),
  getWorkflow: (id: string | number) => req<Workflow>(`/api/workflows/${id}`),
  records: (id: string | number, q: string) =>
    req<{ total: number; items: RecordRow[] }>(`/api/workflows/${id}/records?q=${encodeURIComponent(q)}&limit=200`),
  evidence: (recordId: number) => req<Evidence[]>(`/api/records/${recordId}/evidence`),
};

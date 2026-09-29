export type FieldSpec = { name: string; description: string; required: boolean };
export type WorkflowPlan = {
  objective: string;
  target_count: number | null;
  fields: FieldSpec[];
  sources: { type: string; query: string }[];
  filters: { field: string; operator: string; value: string }[];
  identity_fields: string[];
};
export type Step = {
  id: number; position: number; type: string; status: string;
  output: Record<string, unknown> | null; error: string | null;
};
export type Workflow = {
  id: number; prompt: string; status: string; plan: WorkflowPlan; error: string | null;
  created_at: string; completed_at: string | null; steps: Step[]; record_count: number;
};
export type RecordRow = {
  id: number; data: Record<string, string | null>; confidence: number;
  confidence_label: "high" | "medium" | "low"; validation_status: string;
};
export type Evidence = {
  field_name: string; value: string | null; evidence_text: string; verified: boolean;
  source_url: string; source_title: string | null; retrieved_at: string;
};

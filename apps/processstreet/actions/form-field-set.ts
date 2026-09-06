import type { ActionDefinition } from "@w6w/types";
import { ProcessStreetClient } from "../lib/client.ts";

interface FieldUpdate {
  id: string;
  value?: string;
  values?: string[];
  timeHidden?: boolean;
  dataSetRowId?: string;
}

interface Input {
  workflowRunId: string;
  fields: FieldUpdate[];
}

interface FormFieldValue {
  id: string;
  workflowRunId: string;
  taskId: string;
  key: string;
  data: unknown;
  fieldType: string;
}

/**
 * `POST /workflow-runs/{workflowRunId}/form-fields` — set one or more form field values on a
 * Workflow Run. Field IDs omitted from `fields` are left unchanged. The value shape depends on
 * the field type (verified against the spec's own worked examples, not inferred):
 *
 * - `value` (string) — Short Text, Long Text, Email, Website, Dropdown, Date (ISO string; add
 *   `timeHidden: true` to store date-only), a single Members value, or a Data Set Linked
 *   Dropdown's row id.
 * - `values` (string[]) — Multi Select, Multi Choice, or multiple Members values.
 * - `dataSetRowId` — an alternative to `value` for a Data Set Linked Dropdown.
 *
 * Functionally idempotent even though it's a `POST`: re-sending the same `fields` array leaves
 * the run in the same state rather than creating duplicates (the spec's own framing: values are
 * "created or updated", never appended).
 */
interface Output {
  fields: FormFieldValue[];
}

const formFieldSet: ActionDefinition<Input, Output> = {
  key: "form-field-set",
  type: "perform",
  resource: "form-field",
  title: "Set Form Field Values",
  description: "Set one or more form field values on a Workflow Run.",
  idempotent: true,
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Array of { id, value? | values? | dataSetRowId?, timeHidden? }. Example: " +
        '[{"id":"jPPHp1q50NYEoWZ2zABIfw","value":"hello"}].',
    },
  ],
  output: [{ key: "fields", type: "array", label: "Updated form field values" }],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<{ fields: FormFieldValue[] }>(
      `/workflow-runs/${encodeURIComponent(input.workflowRunId)}/form-fields`,
      { method: "POST", body: { fields: input.fields } },
    );
    return { fields: data.fields };
  },
};

export default formFieldSet;

import type { ActionDefinition } from "@w6w/types";
import { type CursorInput, cursorParams } from "../lib/params.ts";
import { nextCursor, ProcessStreetClient, type PsLink } from "../lib/client.ts";

interface Input extends CursorInput {
  workflowRunId: string;
}

interface FormFieldValue {
  id: string;
  workflowRunId: string;
  taskId: string;
  key: string;
  label?: string;
  data: unknown;
  fieldType: string;
}

/**
 * `GET /workflow-runs/{workflowRunId}/form-fields` — the form field values a Workflow Run has
 * collected so far. `key` is the stable variable name referenced elsewhere as `{{key}}`; `data`'s
 * shape depends on `fieldType`.
 */
interface Output {
  fields: FormFieldValue[];
  nextCursor?: string;
}

const formFieldList: ActionDefinition<Input, Output> = {
  key: "form-field-list",
  type: "read",
  resource: "form-field",
  title: "List Form Field Values",
  description: "List the form field values collected so far in a Workflow Run.",
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
    ...cursorParams,
  ],
  output: [
    { key: "fields", type: "array", label: "Form field values" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { fields: FormFieldValue[]; links?: PsLink[] }
    >(`/workflow-runs/${encodeURIComponent(input.workflowRunId)}/form-fields`, {
      query: { _: input.cursor },
    });
    return { fields: data.fields, nextCursor: nextCursor(data.links) };
  },
};

export default formFieldList;

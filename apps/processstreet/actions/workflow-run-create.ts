import type { ActionDefinition } from "@w6w/types";
import { compact, ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowId: string;
  name?: string;
  dueDate?: string;
  shared?: boolean;
}

/**
 * `POST /workflow-runs` — start a new Workflow Run (what Process Street's own UI still calls a
 * "checklist") from a Workflow blueprint.
 *
 * `idempotent: false`: the spec's own prose says to "attach a `referenceId` on create" for safe
 * retries, but `CreateWorkflowRunRequest` has no such field today (verified against its schema —
 * only `workflowId`/`name`/`dueDate`/`shared` exist). Retrying this call WILL create a duplicate
 * run. See README.
 */
interface Output {
  workflowRunId: string;
}

const workflowRunCreate: ActionDefinition<Input, Output> = {
  key: "workflow-run-create",
  type: "perform",
  resource: "workflow-run",
  title: "Start Workflow Run",
  description: "Start a new Workflow Run (checklist) from a Workflow blueprint.",
  idempotent: false,
  params: [
    {
      key: "workflowId",
      label: "Workflow ID",
      type: "string",
      required: true,
      hint: "Can be copied from the Workflow URL in the web app.",
    },
    { key: "name", label: "Run name", type: "string", hint: "Defaults to the Workflow's name." },
    { key: "dueDate", label: "Due date", type: "datetime" },
    { key: "shared", label: "Shared", type: "boolean" },
  ],
  output: [{ key: "workflowRunId", type: "string", label: "Workflow Run ID" }],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<{ id: string }>("/workflow-runs", {
      method: "POST",
      body: compact({
        workflowId: input.workflowId,
        name: input.name,
        dueDate: input.dueDate,
        shared: input.shared,
      }),
    });
    return { workflowRunId: data.id };
  },
};

export default workflowRunCreate;

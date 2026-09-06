import type { ActionDefinition } from "@w6w/types";
import { ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowRunId: string;
}

/**
 * `DELETE /workflow-runs/{workflowRunId}` — soft-deletes a run. The spec's own idempotency rule
 * applies verbatim: "deleting an already-deleted resource returns `404`, which is fine to
 * ignore" — so a 404 here is treated as success, not an error.
 */
interface Output {
  deleted: boolean;
}

const workflowRunDelete: ActionDefinition<Input, Output> = {
  key: "workflow-run-delete",
  type: "perform",
  resource: "workflow-run",
  title: "Delete Workflow Run",
  description: "Delete (soft-delete) a Workflow Run by id.",
  idempotent: true,
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const path = `/workflow-runs/${encodeURIComponent(input.workflowRunId)}`;
    try {
      await new ProcessStreetClient(ctx).request(path, { method: "DELETE" });
      return { deleted: true };
    } catch (err) {
      if (err instanceof Error && /Process Street 404 /.test(err.message)) {
        return { deleted: true };
      }
      throw err;
    }
  },
};

export default workflowRunDelete;

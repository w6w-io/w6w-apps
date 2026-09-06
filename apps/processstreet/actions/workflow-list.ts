import type { ActionDefinition } from "@w6w/types";
import { type CursorInput, cursorParams } from "../lib/params.ts";
import { nextCursor, ProcessStreetClient, type PsLink } from "../lib/client.ts";

interface Input extends CursorInput {
  name?: string;
}

interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
}

/**
 * `GET /workflows` — "Returns a list of active workflows. The workflows are returned 20 at a
 * time, sorted by name." A Workflow is the reusable blueprint (tasks/form fields/logic); use
 * `workflow-run-create` to start an instance of one.
 */
interface Output {
  workflows: WorkflowSummary[];
  nextCursor?: string;
}

const workflowList: ActionDefinition<Input, Output> = {
  key: "workflow-list",
  type: "read",
  resource: "workflow",
  title: "List Workflows",
  description: "List the Workflow blueprints (templates) in the account, 20 at a time.",
  params: [
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Case-insensitive partial match.",
    },
    ...cursorParams,
  ],
  output: [
    { key: "workflows", type: "array", label: "Workflows" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { workflows: WorkflowSummary[]; links?: PsLink[] }
    >("/workflows", { query: { name: input.name, _: input.cursor } });
    return { workflows: data.workflows, nextCursor: nextCursor(data.links) };
  },
};

export default workflowList;

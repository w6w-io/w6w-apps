import type { ActionDefinition } from "@w6w/types";
import { ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowId: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
}

/** `GET /workflows/{workflowId}` — a single Workflow blueprint by id. */
interface Output {
  workflow: Workflow;
}

const workflowGet: ActionDefinition<Input, Output> = {
  key: "workflow-get",
  type: "read",
  resource: "workflow",
  title: "Get Workflow",
  description: "Read a single Workflow blueprint by id.",
  params: [
    {
      key: "workflowId",
      label: "Workflow ID",
      type: "string",
      required: true,
      hint: "Can be copied from the Workflow URL in the web app.",
    },
  ],
  output: [{ key: "workflow", type: "object", label: "Workflow" }],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<{ data: Workflow }>(
      `/workflows/${encodeURIComponent(input.workflowId)}`,
    );
    return { workflow: data.data };
  },
};

export default workflowGet;

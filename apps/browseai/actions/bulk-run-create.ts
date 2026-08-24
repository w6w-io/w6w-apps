import type { ActionDefinition } from "@w6w/types";
import { asJson, BrowseAiClient } from "../lib/client.ts";
import { robotIdParam } from "../lib/params.ts";

/**
 * `POST /v2/robots/{robotId}/bulk-runs` — run up to 50,000 tasks at once, one
 * per element of `inputParameters`.
 *
 * `inputParameters` here is an **array** of the same object `task-run` takes a
 * single one of — one set of overrides per task the bulk run starts. Not
 * idempotent: a `403 exceeded_bulk_run_threshold` distinctly means the array
 * itself is too large for the team's plan, separate from
 * `credits_limit_reached` (the team is simply out of run credits).
 */
interface Input {
  robotId: string;
  title?: string;
  inputParameters: unknown;
}

interface Output {
  id: string;
  title?: string | null;
  status?: string;
  tasksCount: number;
  createdAt: number;
}

const bulkRunCreate: ActionDefinition<Input, Output> = {
  key: "bulk-run-create",
  type: "perform",
  resource: "bulk-run",
  title: "Create Bulk Run",
  description: "Run a robot up to 50,000 times at once, one task per set of input parameters.",
  idempotent: false,
  params: [
    robotIdParam,
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { minLength: 1, maxLength: 200 },
      hint: "An optional label for this bulk run, shown on the dashboard.",
    },
    {
      key: "inputParameters",
      label: "Input parameters (array)",
      type: "json",
      required: true,
      hint: "An array of input-parameter objects — one element per task to start, e.g. " +
        '`[{"originUrl":"https://a.example"}, {"originUrl":"https://b.example"}]`. Up to 50,000 ' +
        "elements.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Bulk run ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "tasksCount", type: "number", label: "Task count" },
  ],

  async execute(input, ctx) {
    const inputParameters = asJson(input.inputParameters, "Input parameters");
    const body = await new BrowseAiClient(ctx).request<{ result: { bulkRun: Output } }>(
      `/robots/${encodeURIComponent(input.robotId)}/bulk-runs`,
      { method: "POST", body: { title: input.title, inputParameters } },
    );
    return body.result.bulkRun;
  },
};

export default bulkRunCreate;

import type { ActionDefinition } from "@w6w/types";
import { compact, csvList, HubstaffClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /v2/projects/{project_id}/tasks` — create a task (to-do).
 *
 * Body schema `postV2ProjectsProjectIdTasks`: `summary` is the only **required**
 * field; `assignee_id`, `assignee_ids`, `pay_rate`, `bill_rate` and `metadata`
 * are optional. `pay_rate`/`bill_rate` are documented as "set to null to
 * remove", which is an update concern rather than a create one.
 *
 * ## Two documented traps
 *
 * **A 200, not a 201.** Unlike every other create in this API
 * (`POST /v2/organizations/{id}/projects`, `…/clients`, `…/teams` all answer
 * 201), this endpoint's only success code in the OpenAPI document and on the
 * reference page is `200`. A workflow asserting on a 201 here would treat a
 * successful create as a failure.
 *
 * **An integrated project's tasks are not creatable here.** The vendor's own
 * note on this operation: "If this project is integrated with a 3rd party tool,
 * you must create the task in that tool instead." The task row from
 * `task-list`/`task-get` carries `integration_id` and `remote_id`, and those are
 * the fields to check first when this call is refused.
 *
 * Not idempotent: Hubstaff accepts no idempotency key, so a retry creates a
 * second task.
 */
interface Input {
  project_id: number;
  summary: string;
  assignee_ids?: string;
  pay_rate?: number;
  bill_rate?: number;
  metadata?: unknown;
}

const action: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a project (POST /v2/projects/{project_id}/tasks).",
  idempotent: false,
  params: [
    projectIdParam,
    {
      key: "summary",
      label: "Summary",
      type: "string",
      required: true,
      hint: "The task's summary line.",
    },
    {
      key: "assignee_ids",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated user IDs, e.g. `651956,651957`. Sent as the `assignee_ids` array. " +
        "Hubstaff also accepts a single `assignee_id`; this action uses the array form.",
      advanced: true,
    },
    {
      key: "pay_rate",
      label: "Pay rate",
      type: "number",
      hint: "Task pay rate, overriding the project's.",
      advanced: true,
    },
    {
      key: "bill_rate",
      label: "Bill rate",
      type: "number",
      hint: "Task bill rate, overriding the project's.",
      advanced: true,
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint:
        'JSON array of `{"key": "…", "value": "…"}` pairs, e.g. `[{"key":"ticket","value":"SUP-1"}]`.',
      advanced: true,
    },
  ],
  output: [{ key: "task", type: "object", label: "The created task" }],

  execute(input, ctx) {
    const assigneeIds = csvList(input.assignee_ids);
    const body = compact({
      summary: input.summary,
      assignee_ids: assigneeIds === undefined
        ? undefined
        : assigneeIds.split(",").map((id) => Number(id)),
      pay_rate: input.pay_rate,
      bill_rate: input.bill_rate,
      metadata: input.metadata,
    });
    return new HubstaffClient(ctx).request(`/projects/${input.project_id}/tasks`, {
      method: "POST",
      body,
    });
  },
};

export default action;

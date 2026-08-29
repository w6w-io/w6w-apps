import type { ActionDefinition } from "@w6w/types";
import { compact, csv, entityRef, json, OnfleetClient } from "../lib/client.ts";
import { containerParam, destinationParam, metadataParam, recipientsParam } from "../lib/params.ts";

/**
 * `POST /tasks` — create a delivery/pickup task.
 *
 * `destination` and `recipients` accept either an existing id or an inline
 * object that Onfleet creates for you as part of this call — see
 * `destination-create` and `recipient-create` for a warehouse or a repeat
 * customer worth creating once and referencing by id afterwards.
 *
 * `container` and `autoAssign` are mutually exclusive: set one to place the
 * task on a specific worker/team/organization, or the other to hand it to
 * Onfleet's automatic assignment. Leaving both unset puts the task in the
 * creating organization's own unassigned pool.
 */
const action: ActionDefinition = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create task",
  description: "Create a delivery or pickup task, with a destination and optional recipient.",
  idempotent: false,
  params: [
    destinationParam(true),
    recipientsParam,
    {
      key: "pickupTask",
      label: "Pickup task",
      type: "boolean",
      default: false,
      hint: "Whether this task is a pickup rather than a dropoff.",
    },
    { key: "notes", label: "Notes", type: "text", default: "", hint: "Up to 10,000 characters." },
    containerParam,
    {
      key: "autoAssign",
      label: "Auto-assign",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Optional. {"mode":"distance"|"load"} to hand this task to Onfleet\'s automatic ' +
        "assignment among on-duty workers. Not allowed together with `container`.",
    },
    {
      key: "completeAfter",
      label: "Complete after",
      type: "number",
      default: "",
      hint: "Unix time (ms) — the earliest this task should be completed.",
    },
    {
      key: "completeBefore",
      label: "Complete before",
      type: "number",
      default: "",
      hint: "Unix time (ms) — the latest this task should be completed.",
    },
    {
      key: "dependencies",
      label: "Dependencies",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated task IDs that must complete before this one may start.",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      default: "",
      advanced: true,
      hint: "Units dropped off at this task, for route optimization purposes.",
    },
    {
      key: "serviceTime",
      label: "Service time (minutes)",
      type: "number",
      default: "",
      advanced: true,
      hint: "Minutes the worker is expected to spend on arrival, for route optimization.",
    },
    {
      key: "merchant",
      label: "Merchant organization ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Optional. The connected organization shown to the recipient as the merchant. " +
        "Defaults to your own organization.",
    },
    {
      key: "executor",
      label: "Executor organization ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Optional. The connected organization responsible for fulfilling this task. " +
        "Defaults to your own organization.",
    },
    {
      key: "requirements",
      label: "Completion requirements",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Optional. {"signature":true,"photo":true,"notes":true,"minimumAge":21}.',
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "shortId", type: "string", label: "Short ID" },
    { key: "trackingURL", type: "string", label: "Live tracking URL" },
    { key: "state", type: "number", label: "0 unassigned · 1 assigned · 2 active · 3 completed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const destination = entityRef(p.destination, "destination");
    if (!destination) throw new Error("`destination` is required");

    const recipients = json(p.recipients, "recipients");
    if (recipients !== undefined && !Array.isArray(recipients)) {
      throw new Error("`recipients` must be a JSON array");
    }

    const task = await new OnfleetClient(ctx).request<
      { id?: string; shortId?: string; trackingURL?: string; state?: number }
    >("/tasks", {
      method: "POST",
      body: compact({
        destination,
        recipients,
        pickupTask: p.pickupTask === true ? true : undefined,
        notes: p.notes,
        container: json(p.container, "container"),
        autoAssign: json(p.autoAssign, "autoAssign"),
        completeAfter: p.completeAfter,
        completeBefore: p.completeBefore,
        dependencies: csv(p.dependencies),
        quantity: p.quantity,
        serviceTime: p.serviceTime,
        merchant: p.merchant,
        executor: p.executor,
        requirements: json(p.requirements, "requirements"),
        metadata: json(p.metadata, "metadata"),
      }),
    });

    ctx.log("info", "created an Onfleet task", { taskId: task?.id, state: task?.state });
    return task;
  },
};

export default action;

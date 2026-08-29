import type { ActionDefinition } from "@w6w/types";
import { compact, csv, OnfleetClient } from "../lib/client.ts";

/**
 * `GET /tasks/all` — a paginated collection of every task in the
 * organization, in a `from`/`to` time window.
 *
 * `from` compares against **creation** time for every state except
 * completed, which compares against **completion** time — the same
 * timestamp field means something different depending on the row it is on.
 * Each page returns up to 64 tasks and a `lastId` when more remain; pass
 * that back as `lastId` to walk forward. `lastId` being absent means this
 * was the last page.
 */
const action: ActionDefinition = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List tasks",
  description: "List tasks created or completed in a time window, paginated 64 at a time.",
  params: [
    {
      key: "from",
      label: "From (Unix ms)",
      type: "number",
      required: true,
      hint: "Tasks created (or completed, for completed tasks) at or after this time.",
    },
    {
      key: "to",
      label: "To (Unix ms)",
      type: "number",
      default: "",
      hint: "Defaults to now.",
    },
    { key: "lastId", label: "Last ID (pagination cursor)", type: "string", default: "" },
    {
      key: "state",
      label: "States",
      type: "string",
      default: "",
      hint: "Comma-separated: 0 unassigned, 1 assigned, 2 active, 3 completed.",
    },
    { key: "worker", label: "Worker ID", type: "string", default: "" },
    {
      key: "dependencies",
      label: "Dependency task IDs",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "containers",
      label: "Container IDs",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated organization/team/worker container IDs. Ignored if `worker` or " +
        "`state` is also set.",
    },
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks in this page" },
    { key: "lastId", type: "string", label: "Pass as `lastId` for the next page, if present" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.from) throw new Error("`from` is required");

    const result = await new OnfleetClient(ctx).request<
      { tasks?: unknown[]; lastId?: string }
    >("/tasks/all", {
      query: compact({
        from: p.from,
        to: p.to,
        lastId: p.lastId,
        state: csv(p.state)?.join(","),
        worker: p.worker,
        dependencies: csv(p.dependencies)?.join(","),
        containers: csv(p.containers)?.join(","),
      }) as Record<string, string | number>,
    });

    return { tasks: result?.tasks ?? [], lastId: result?.lastId };
  },
};

export default action;

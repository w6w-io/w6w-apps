import type { ActionDefinition } from "@w6w/types";
import { compact, csv, OnfleetClient } from "../lib/client.ts";

/**
 * `GET /workers` — every worker in the organization.
 *
 * `states` filters on duty status: `0` off-duty, `1` idle (on-duty, no
 * active task), `2` active (on-duty, working a task).
 */
const action: ActionDefinition = {
  key: "worker-list",
  type: "search",
  resource: "worker",
  title: "List workers",
  description: "List workers, optionally filtered by team, duty state or phone.",
  params: [
    { key: "teams", label: "Team IDs", type: "string", default: "", hint: "Comma-separated." },
    {
      key: "states",
      label: "Duty states",
      type: "string",
      default: "",
      hint: "Comma-separated: 0 off-duty, 1 idle, 2 active.",
    },
    { key: "phones", label: "Phone numbers", type: "string", default: "", advanced: true },
    {
      key: "filter",
      label: "Fields to return",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated field names, e.g. name,location.",
    },
  ],
  output: [{ key: "workers", type: "array", label: "Workers" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workers = await new OnfleetClient(ctx).request<unknown[]>("/workers", {
      query: compact({
        teams: csv(p.teams)?.join(","),
        states: csv(p.states)?.join(","),
        phones: csv(p.phones)?.join(","),
        filter: csv(p.filter)?.join(","),
      }) as Record<string, string>,
    });
    return { workers: workers ?? [] };
  },
};

export default action;

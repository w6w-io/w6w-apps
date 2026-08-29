import type { ActionDefinition } from "@w6w/types";
import { compact, csv, OnfleetClient } from "../lib/client.ts";

/**
 * `POST /teams` — group workers under managers, optionally based out of a
 * hub.
 */
const action: ActionDefinition = {
  key: "team-create",
  type: "perform",
  resource: "team",
  title: "Create team",
  description: "Create a team of workers under one or more managing administrators.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Must be unique." },
    { key: "workers", label: "Worker IDs", type: "string", default: "", hint: "Comma-separated." },
    {
      key: "managers",
      label: "Manager admin IDs",
      type: "string",
      default: "",
      hint: "Comma-separated administrator IDs.",
    },
    { key: "hub", label: "Hub ID", type: "string", default: "" },
    {
      key: "enableSelfAssignment",
      label: "Enable self-assignment",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Lets workers pick up tasks from the team's unassigned container themselves.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Team ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.name) throw new Error("`name` is required");

    const team = await new OnfleetClient(ctx).request<{ id?: string }>("/teams", {
      method: "POST",
      body: compact({
        name: p.name,
        workers: csv(p.workers),
        managers: csv(p.managers),
        hub: p.hub,
        enableSelfAssignment: p.enableSelfAssignment === true ? true : undefined,
      }),
    });

    ctx.log("info", "created an Onfleet team", { teamId: team?.id });
    return team;
  },
};

export default action;

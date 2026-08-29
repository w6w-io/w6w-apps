import type { ActionDefinition } from "@w6w/types";
import { compact, csv, OnfleetClient } from "../lib/client.ts";

/**
 * `PUT /teams/:id` — update a team's name, roster, managers or hub.
 *
 * Setting `workers` **replaces** the team's whole roster rather than adding
 * to it — a worker omitted from the list is removed from the team, not left
 * alone.
 */
const action: ActionDefinition = {
  key: "team-update",
  type: "perform",
  resource: "team",
  title: "Update team",
  description: "Update a team. `workers`/`managers`, when given, REPLACE the whole list.",
  idempotent: true,
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "workers",
      label: "Worker IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Replaces the whole roster.",
    },
    {
      key: "managers",
      label: "Manager admin IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Replaces the whole list.",
    },
    { key: "hub", label: "Hub ID", type: "string", default: "" },
    {
      key: "enableSelfAssignment",
      label: "Enable self-assignment",
      type: "boolean",
      default: "",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Team ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { teamId } = p as { teamId: string };
    if (!teamId) throw new Error("`teamId` is required");

    const body = compact({
      name: p.name,
      workers: csv(p.workers),
      managers: csv(p.managers),
      hub: p.hub,
      enableSelfAssignment: typeof p.enableSelfAssignment === "boolean"
        ? p.enableSelfAssignment
        : undefined,
    });
    if (Object.keys(body).length === 0) throw new Error("no fields to update were provided");

    return await new OnfleetClient(ctx).request(`/teams/${encodeURIComponent(teamId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;

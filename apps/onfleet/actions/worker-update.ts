import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, OnfleetClient } from "../lib/client.ts";
import { vehicleParam } from "../lib/params.ts";

/**
 * `PUT /workers/:id` — update a worker's name, teams, vehicle or capacity.
 *
 * **`phone` cannot be updated this way** — Onfleet accepts the request
 * without error but silently leaves the phone number unchanged, since phone
 * doubles as the worker's login identity.
 */
const action: ActionDefinition = {
  key: "worker-update",
  type: "perform",
  resource: "worker",
  title: "Update worker",
  description: "Update a worker's name, teams, vehicle, capacity or display name. `phone` " +
    "cannot be changed this way — Onfleet ignores it without an error.",
  idempotent: true,
  params: [
    { key: "workerId", label: "Worker ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "teams", label: "Team IDs", type: "string", default: "", hint: "Comma-separated." },
    vehicleParam,
    { key: "capacity", label: "Capacity", type: "number", default: "", advanced: true },
    { key: "displayName", label: "Display name", type: "string", default: "", advanced: true },
  ],
  output: [{ key: "id", type: "string", label: "Worker ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { workerId } = p as { workerId: string };
    if (!workerId) throw new Error("`workerId` is required");

    const body = compact({
      name: p.name,
      teams: csv(p.teams),
      vehicle: json(p.vehicle, "vehicle"),
      capacity: p.capacity,
      displayName: p.displayName,
    });
    if (Object.keys(body).length === 0) throw new Error("no fields to update were provided");

    return await new OnfleetClient(ctx).request(`/workers/${encodeURIComponent(workerId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;

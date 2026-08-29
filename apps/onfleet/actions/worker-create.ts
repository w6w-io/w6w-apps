import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, OnfleetClient } from "../lib/client.ts";
import { vehicleParam } from "../lib/params.ts";

/**
 * `POST /workers` — add a driver/courier.
 *
 * Onfleet generates a temporary password and texts it to `phone` along with
 * a link to the mobile app; the worker sets a permanent password on first
 * login. A worker's photo can only be set from the dashboard or the mobile
 * app, never through this API.
 */
const action: ActionDefinition = {
  key: "worker-create",
  type: "perform",
  resource: "worker",
  title: "Create worker",
  description: "Add a worker (driver/courier). Onfleet texts them an app download link and a " +
    "temporary password.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      required: true,
      hint: "Valid for the organization's country setting.",
    },
    {
      key: "teams",
      label: "Team IDs",
      type: "string",
      required: true,
      hint: "Comma-separated team IDs this worker belongs to.",
    },
    vehicleParam,
    {
      key: "capacity",
      label: "Capacity",
      type: "number",
      default: "",
      advanced: true,
      hint: "Maximum units this worker can carry, for route optimization purposes.",
    },
    {
      key: "displayName",
      label: "Display name",
      type: "string",
      default: "",
      advanced: true,
      hint: "Shown instead of the worker's real name in SMS, tracking pages and across " +
        "connected organizations.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Worker ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.name) throw new Error("`name` is required");
    if (!p.phone) throw new Error("`phone` is required");
    const teams = csv(p.teams);
    if (!teams) throw new Error("`teams` is required");

    const worker = await new OnfleetClient(ctx).request<{ id?: string; name?: string }>(
      "/workers",
      {
        method: "POST",
        body: compact({
          name: p.name,
          phone: p.phone,
          teams,
          vehicle: json(p.vehicle, "vehicle"),
          capacity: p.capacity,
          displayName: p.displayName,
        }),
      },
    );

    ctx.log("info", "created an Onfleet worker", { workerId: worker?.id });
    return worker;
  },
};

export default action;

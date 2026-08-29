import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, OnfleetClient } from "../lib/client.ts";

/**
 * `POST /hubs` — create a hub (a dispatch home base) and optionally assign
 * it to teams. A hub's address uses the same shape as a destination's.
 */
const action: ActionDefinition = {
  key: "hub-create",
  type: "perform",
  resource: "hub",
  title: "Create hub",
  description: "Create a hub — an address teams dispatch from — and optionally assign teams.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "address",
      label: "Address",
      type: "json",
      required: true,
      default: "",
      hint: 'Same shape as a destination address: {"number":"...","street":"...","city":"...",' +
        '"state":"...","country":"..."}.',
    },
    { key: "teams", label: "Team IDs", type: "string", default: "", hint: "Comma-separated." },
    { key: "phone", label: "Phone", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Hub ID" },
    { key: "location", type: "array", label: "Location" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.name) throw new Error("`name` is required");
    const address = json(p.address, "address");
    if (!address) throw new Error("`address` is required");

    const hub = await new OnfleetClient(ctx).request<{ id?: string }>("/hubs", {
      method: "POST",
      body: compact({
        name: p.name,
        address,
        teams: csv(p.teams),
        phone: p.phone,
      }),
    });

    ctx.log("info", "created an Onfleet hub", { hubId: hub?.id });
    return hub;
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { compact, json, OnfleetClient } from "../lib/client.ts";

/** `PUT /hubs/:id` — update a hub's name, address or phone. */
const action: ActionDefinition = {
  key: "hub-update",
  type: "perform",
  resource: "hub",
  title: "Update hub",
  description: "Update a hub's name, address or phone.",
  idempotent: true,
  params: [
    { key: "hubId", label: "Hub ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "address", label: "Address", type: "json", default: "" },
    { key: "phone", label: "Phone", type: "string", default: "" },
  ],
  output: [{ key: "id", type: "string", label: "Hub ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { hubId } = p as { hubId: string };
    if (!hubId) throw new Error("`hubId` is required");

    const body = compact({ name: p.name, address: json(p.address, "address"), phone: p.phone });
    if (Object.keys(body).length === 0) throw new Error("no fields to update were provided");

    return await new OnfleetClient(ctx).request(`/hubs/${encodeURIComponent(hubId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;

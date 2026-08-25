import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `POST /v2/tags/{tag_name}` — create a reusable tag ahead of time. Also happens
 * implicitly the first time `shipment-tag-add` uses a name that doesn't exist yet, so
 * this action is only needed to pre-populate a tag list in the ShipStation dashboard
 * before any shipment uses it.
 */
const action: ActionDefinition = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create a Tag",
  description: "Create a reusable shipment tag ahead of time. A tag is just its name, so " +
    "re-creating an existing one is expected to be harmless (not separately verified against a " +
    "live duplicate).",
  idempotent: true,
  params: [
    { key: "name", label: "Tag Name", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Tag name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (!name) throw new Error("`name` is required");

    const result = await new ShipStationClient(ctx).request<{ name?: string }>(
      `/tags/${encodeURIComponent(name)}`,
      { method: "POST" },
    );
    return { name: result?.name ?? name };
  },
};

export default action;

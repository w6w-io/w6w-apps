import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/** `GET /v2/tags` — every tag name available on this account. */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List every shipment tag available on this account.",
  params: [],
  output: [
    { key: "tags", type: "array", label: "Tag names" },
  ],

  async execute(_input, ctx) {
    const result = await new ShipStationClient(ctx).request<{ tags?: unknown[] } | unknown[]>(
      "/tags",
    );
    // The docs' own example response is truncated mid-object, so this tolerates
    // either a bare array or a `{tags: [...]}` wrapper.
    const tags = Array.isArray(result) ? result : (result as { tags?: unknown[] })?.tags ?? [];
    return { tags };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `GET /hubs` — every hub in the organization. There is no get-single-hub endpoint. */
const action: ActionDefinition = {
  key: "hub-list",
  type: "search",
  resource: "hub",
  title: "List hubs",
  description: "List every hub in the organization.",
  params: [],
  output: [{ key: "hubs", type: "array", label: "Hubs" }],

  async execute(_input, ctx) {
    const hubs = await new OnfleetClient(ctx).request<unknown[]>("/hubs");
    return { hubs: hubs ?? [] };
  },
};

export default action;

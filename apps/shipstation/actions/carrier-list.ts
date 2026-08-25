import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `GET /v2/carriers` — every carrier account connected to this ShipStation account.
 * `carrier_id` from here is required by `shipment-create`, `rate-get`, and
 * `label-create`.
 */
const action: ActionDefinition = {
  key: "carrier-list",
  type: "read",
  resource: "carrier",
  title: "List Carrier Accounts",
  description: "List every carrier account connected to this ShipStation account.",
  params: [],
  output: [
    { key: "carriers", type: "array", label: "Connected carrier accounts" },
  ],

  async execute(_input, ctx) {
    const result = await new ShipStationClient(ctx).request<{ carriers?: unknown[] }>("/carriers");
    return { carriers: result?.carriers ?? [] };
  },
};

export default action;

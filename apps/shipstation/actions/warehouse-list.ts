import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `GET /v2/warehouses` — every shipping warehouse (origin/return address) set up on
 * this account. `warehouse_id` from here can substitute for `shipFrom` on
 * `shipment-create`, `rate-get`, and `label-create`.
 *
 * Not to be confused with **inventory warehouses** (`/v2/inventory_warehouses`), a
 * separate ShipStation feature for tracking on-hand SKU counts — unrelated to
 * shipping origins and out of scope for this app.
 */
const action: ActionDefinition = {
  key: "warehouse-list",
  type: "read",
  resource: "warehouse",
  title: "List Warehouses",
  description: "List every shipping warehouse (ship-from/return address) set up on this account.",
  params: [],
  output: [
    { key: "warehouses", type: "array", label: "Shipping warehouses" },
  ],

  async execute(_input, ctx) {
    const result = await new ShipStationClient(ctx).request<{ warehouses?: unknown[] }>(
      "/warehouses",
    );
    return { warehouses: result?.warehouses ?? [] };
  },
};

export default action;

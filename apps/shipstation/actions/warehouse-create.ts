import type { ActionDefinition } from "@w6w/types";
import type { Address } from "../lib/client.ts";
import { compact, json, ShipStationClient } from "../lib/client.ts";

/**
 * `POST /v2/warehouses` — create a shipping warehouse (origin/return address).
 *
 * The first warehouse ever created on an account automatically becomes the default —
 * ShipStation does not ask, and there is no request field to opt out of it.
 */
const action: ActionDefinition = {
  key: "warehouse-create",
  type: "perform",
  resource: "warehouse",
  title: "Create a Warehouse",
  description: "Create a shipping warehouse. The FIRST warehouse ever created on an account " +
    "automatically becomes the default, with no way to opt out of that.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "originAddress",
      label: "Origin Address",
      type: "json",
      required: true,
      default: "",
      hint: '{"name":"…","company_name":"…","phone":"…","address_line1":"…","city_locality":"…",' +
        '"state_province":"…","postal_code":"…","country_code":"US"}',
    },
    {
      key: "returnAddress",
      label: "Return Address",
      type: "json",
      default: "",
      advanced: true,
      hint: "Same shape as Origin Address. Defaults to the origin address when omitted.",
    },
    { key: "isDefault", label: "Make Default Warehouse", type: "boolean", default: false },
  ],
  output: [
    { key: "warehouseId", type: "string", label: "Warehouse ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (!name) throw new Error("`name` is required");
    const originAddress = json(p.originAddress, "originAddress") as Address | undefined;
    if (!originAddress) throw new Error("`originAddress` is required");

    const warehouse = await new ShipStationClient(ctx).request<Record<string, unknown>>(
      "/warehouses",
      {
        method: "POST",
        body: compact({
          name,
          origin_address: originAddress,
          return_address: json(p.returnAddress, "returnAddress"),
          is_default: p.isDefault === true ? true : undefined,
        }),
      },
    );
    ctx.log("info", "created a ShipStation warehouse", { warehouseId: warehouse.warehouse_id });
    return { ...warehouse, warehouseId: warehouse.warehouse_id };
  },
};

export default action;

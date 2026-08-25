import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `GET /v2/carriers/{carrier_id}` — one carrier account's full detail, including its
 * available `services`, `packages`, and `options` — the values `serviceCode` and
 * carrier-specific advanced options across this app come from.
 */
const action: ActionDefinition = {
  key: "carrier-get",
  type: "read",
  resource: "carrier",
  title: "Get a Carrier Account",
  description: "Get one carrier account's services, package types, and options.",
  params: [
    { key: "carrierId", label: "Carrier ID", type: "string", required: true },
  ],
  output: [
    { key: "carrierId", type: "string", label: "Carrier ID" },
    { key: "services", type: "array", label: "Service codes this carrier offers" },
    { key: "packages", type: "array", label: "Package types this carrier supports" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const carrierId = typeof p.carrierId === "string" ? p.carrierId.trim() : "";
    if (!carrierId) throw new Error("`carrierId` is required");

    const carrier = await new ShipStationClient(ctx).request<Record<string, unknown>>(
      `/carriers/${encodeURIComponent(carrierId)}`,
    );
    return {
      ...carrier,
      carrierId: carrier.carrier_id,
      services: carrier.services ?? [],
      packages: carrier.packages ?? [],
    };
  },
};

export default action;

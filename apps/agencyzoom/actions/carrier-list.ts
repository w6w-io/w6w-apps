import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/**
 * `GET /v1/api/carriers` — every insurance carrier configured for this
 * agency, plus each one's `standardCarrierCode` where the agency uses
 * AgencyZoom's enterprise carrier catalog.
 */
interface Carrier {
  id?: number;
  name?: string;
  standardCarrierCode?: string;
}

const carrierList: ActionDefinition<Record<string, never>> = {
  key: "carrier-list",
  type: "read",
  resource: "carrier",
  title: "List Carriers",
  description: "List the insurance carriers configured for this agency, for use with " +
    "opportunity/policy carrierId.",
  params: [],
  output: [{ key: "carriers", type: "array", label: "Carriers" }],

  async execute(_input, ctx) {
    const carriers = await new AgencyZoomClient(ctx).get<Carrier[]>("/carriers");
    return { carriers: carriers ?? [] };
  },
};

export default carrierList;

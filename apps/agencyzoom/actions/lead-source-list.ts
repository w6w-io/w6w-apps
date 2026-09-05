import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/** `GET /v1/api/lead-sources` — every lead source configured for this agency. */
interface LeadSource {
  id?: number;
  name?: string;
}

const leadSourceList: ActionDefinition<Record<string, never>> = {
  key: "lead-source-list",
  type: "read",
  resource: "lead-source",
  title: "List Lead Sources",
  description: "List the lead sources configured for this agency, for use with " +
    "lead-create/lead-update's required leadSourceId.",
  params: [],
  output: [{ key: "leadSources", type: "array", label: "Lead sources" }],

  async execute(_input, ctx) {
    const leadSources = await new AgencyZoomClient(ctx).get<LeadSource[]>("/lead-sources");
    return { leadSources: leadSources ?? [] };
  },
};

export default leadSourceList;

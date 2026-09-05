import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/**
 * `GET /v1/api/csrs` — every Customer Service Representative, for `csrId`
 * fields on leads/policies.
 *
 * Unlike every other reference-lookup endpoint in this app (`/carriers`,
 * `/employees`, `/lead-sources`), this one answers `{"csrs": [...]}` rather
 * than a bare array — measured against the OpenAPI document's own
 * `CsrResponse` schema. Reusing the bare-array unwrap the other lookups share
 * would type-check and silently return `undefined`.
 */
interface Csr {
  id?: number;
  name?: string;
}

interface CsrResponse {
  csrs?: Csr[];
}

const csrList: ActionDefinition<Record<string, never>> = {
  key: "csr-list",
  type: "read",
  resource: "csr",
  title: "List CSRs",
  description: "List the Customer Service Representatives configured for this agency.",
  params: [],
  output: [{ key: "csrs", type: "array", label: "CSRs" }],

  async execute(_input, ctx) {
    const body = await new AgencyZoomClient(ctx).get<CsrResponse>("/csrs");
    return { csrs: body?.csrs ?? [] };
  },
};

export default csrList;

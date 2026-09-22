import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";

/**
 * `GET /API/v3/organizations/current` — this account's organization.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404). The
 * path is the literal `current`, so there is no id param and nothing to page.
 */
const organizationGet: ActionDefinition = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Current Organization",
  description: "Fetch the organization this connection belongs to.",
  output: [
    { key: "organizationId", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Organization name" },
    { key: "divisionId", type: "string", label: "Division ID" },
    { key: "type", type: "string", label: "Organization type" },
  ],

  async execute(_input, ctx) {
    return await new QualtricsClient(ctx).request("/organizations/current");
  },
};

export default organizationGet;

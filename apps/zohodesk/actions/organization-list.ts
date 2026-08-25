import type { ActionDefinition } from "@w6w/types";
import { type DeskListEnvelope, ZohoDeskClient } from "../lib/client.ts";

interface Organization {
  id?: string;
  companyName?: string;
  isDefault?: string | boolean;
  edition?: string;
  portalName?: string;
  [key: string]: unknown;
}

/**
 * `GET /organizations` — the one Desk endpoint documented to need NO `orgId`
 * header, since it is how one is discovered. Lists every organization the
 * current user belongs to (a different, narrower endpoint,
 * `GET /accessibleOrganizations`, lists ones the token itself is scoped to —
 * and confusingly DOES require `orgId`; this app exposes the one that works
 * without one).
 */
const organizationList: ActionDefinition<Record<string, never>, { data: Organization[] }> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description:
    "List every Zoho Desk organization the connected user belongs to. Use an id from here as " +
    "`orgId` on any other action, or leave it unset to use the connection's default.",
  params: [],
  output: [{ key: "data", type: "array", label: "Organizations" }],

  async execute(_input, ctx) {
    const body = await new ZohoDeskClient(ctx).request<DeskListEnvelope<Organization>>(
      "/organizations",
    );
    return { data: body.data ?? [] };
  },
};

export default organizationList;

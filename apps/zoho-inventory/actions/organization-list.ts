import type { ActionDefinition } from "@w6w/types";
import { ZohoInventoryClient } from "../lib/client.ts";

interface Output {
  organizations: Array<Record<string, unknown>>;
}

/**
 * `GET /organizations` is the one Inventory endpoint that takes no
 * `organization_id` — it's how you discover one. Every other action in this
 * app defaults its `organizationId` param to the id `auth/oauth2.ts`'s
 * `afterConnect` recorded, so this action exists for the multi-organization
 * case: pick a different id and pass it explicitly elsewhere.
 */
const organizationList: ActionDefinition<Record<string, never>, Output> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "List every Zoho Inventory organization this connection can access.",
  params: [],
  output: [{ key: "organizations", type: "array", label: "Organizations" }],

  async execute(_input, ctx) {
    const body = await new ZohoInventoryClient(ctx).request<
      { organizations: Array<Record<string, unknown>> }
    >(
      "/organizations",
    );
    return { organizations: body.organizations ?? [] };
  },
};

export default organizationList;

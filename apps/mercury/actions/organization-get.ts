import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

/**
 * `GET /organization` — "Retrieve information about your organization
 * including EIN, legal business name, and DBAs." `operationId:
 * getOrganization`.
 *
 * Not used as this app's auth probe (see `auth/api-token.ts`) precisely
 * because its response includes the organization's EIN — sensitive business
 * identity data a credential-health check should never need to fetch.
 */
type Input = Record<string, never>;

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Retrieve organization details: EIN, legal business name, and DBAs.",
  params: [],
  output: [{ key: "organization", type: "object", label: "Organization" }],

  async execute(_input, ctx) {
    const body = await new MercuryClient(ctx).json<{ organization?: unknown }>("/organization");
    return { organization: body?.organization };
  },
};

export default organizationGet;

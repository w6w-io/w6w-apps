import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * `GET /v1/Organizations` — the connected organization.
 *
 * Despite the plural resource name and the `{"value": [...]}` list envelope, a
 * `client_credentials` connection belongs to exactly one organization, so this always
 * returns that single row (or nothing, which would mean the token is not actually bound to
 * an organization).
 */
type Input = Record<string, never>;

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Get the connected Jibble organization.",
  requiresAuth: true,
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(_input, ctx) {
    const page = await new JibbleClient(ctx).list<Record<string, unknown>>(
      WORKSPACE_HOST,
      "/v1/Organizations",
    );
    return page.items[0] ?? null;
  },
};

export default organizationGet;

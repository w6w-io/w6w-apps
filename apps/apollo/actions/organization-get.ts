import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/**
 * `GET /organizations/{id}` — one company from Apollo's database, by Apollo organization
 * ID. This is the database record (from `organization-search`/`organization-enrich`),
 * distinct from an "account" — a company your own team has saved (`account-get`).
 */
interface Input {
  id: string;
}

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Fetch one company from Apollo's database by its Apollo organization ID.",
  params: [{ key: "id", label: "Organization", type: "string", required: true }],
  output: [{ key: "organization", type: "object", label: "The organization" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ organization?: unknown }>(
      `/organizations/${encodeId(input.id)}`,
    );
    return { organization: body.organization ?? null };
  },
};

export default organizationGet;

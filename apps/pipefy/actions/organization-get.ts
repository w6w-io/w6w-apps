import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `{ organization(id: 12345) { id name planName createdAt } }` — Pipefy's
 * own "Basic Organization Query" example.
 */
const buildQuery = (id: string) =>
  `{ organization(id: ${gqlLiteral(id)}) { id name planName createdAt } }`;

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Get a single organization by ID.",
  params: [
    { key: "id", label: "Organization ID", type: "string", required: true },
  ],
  output: [{ key: "organization", type: "object", label: "The organization" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ organization: unknown }>(
      buildQuery(input.id),
    );
    return data.organization;
  },
};

export default organizationGet;

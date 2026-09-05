import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PipefyClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
}

/**
 * `{ organization(id) { tables { edges { node { id name internal_id } } }
 * } }` — Pipefy's own "Find Tables" example.
 */
const buildQuery = (organizationId: string) =>
  `{ organization(id: ${
    gqlLiteral(organizationId)
  }) { tables { edges { node { id name internal_id } } } } }`;

const tableList: ActionDefinition<Input> = {
  key: "table-list",
  type: "read",
  resource: "table",
  title: "List Database Tables",
  description: "List every Database Table in an organization.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
  ],
  output: [{ key: "tables", type: "array", label: "Tables" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<
      { organization: { tables: { edges: Array<{ node: unknown }> } } | null }
    >(buildQuery(input.organizationId));
    if (!data.organization) throw new Error("Pipefy returned no organization");
    return { tables: data.organization.tables.edges.map((e) => e.node) };
  },
};

export default tableList;

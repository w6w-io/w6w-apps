import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PIPE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
}

/**
 * `{ organization(id) { pipes { id name } } }` — Pipefy's own "Find Pipes"
 * example, expanded with the same field set as `pipe-get`.
 */
const buildQuery = (organizationId: string) =>
  `{ organization(id: ${gqlLiteral(organizationId)}) { pipes { ${PIPE_FIELDS} } } }`;

const pipeList: ActionDefinition<Input> = {
  key: "pipe-list",
  type: "read",
  resource: "pipe",
  title: "List Pipes",
  description: "List every pipe in an organization.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
  ],
  output: [{ key: "pipes", type: "array", label: "Pipes" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<
      { organization: { pipes: unknown[] } | null }
    >(buildQuery(input.organizationId));
    if (!data.organization) throw new Error("Pipefy returned no organization");
    return { pipes: data.organization.pipes };
  },
};

export default pipeList;

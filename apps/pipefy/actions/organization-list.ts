import type { ActionDefinition } from "@w6w/types";
import { csvIds, gqlLiteral, PipefyClient } from "../lib/client.ts";

interface Input {
  ids?: string;
}

/**
 * `{ organizations(ids:[...]) { id name } }` — Pipefy's own "Basic
 * Organizations Query" and "Objects Within Organizations" examples. `ids`
 * is optional in the doc's basic example (no argument at all lists every
 * organization the credential can see); the filtered form is shown too.
 */
function buildQuery(ids?: number[]): string {
  const arg = ids?.length ? `(ids: ${gqlLiteral(ids)})` : "";
  return `{ organizations${arg} { id name } }`;
}

const organizationList: ActionDefinition<Input> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "List the organizations the connected account can see.",
  params: [
    {
      key: "ids",
      label: "Organization IDs (optional)",
      type: "string",
      hint: "Comma-separated organization IDs. Leave blank to list every visible organization.",
    },
  ],
  output: [{ key: "organizations", type: "array", label: "Organizations" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ organizations: unknown[] }>(
      buildQuery(csvIds(input.ids)),
    );
    return { organizations: data.organizations };
  },
};

export default organizationList;

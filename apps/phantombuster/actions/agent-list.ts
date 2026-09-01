import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";

/**
 * `GET /agents/fetch-all` — every agent (Phantom) in the current organization.
 *
 * `withArgument` is deliberately not exposed as a param. The vendor gates the
 * agent's stored launch configuration (`argument`) behind that flag — for
 * many catalog agents that configuration embeds the target site's session
 * cookie (see `lib/client.ts`) — and this action never turns it on, so a list
 * read never has that material to leak in the first place.
 */
interface Input {
  inputTypes?: string;
  outputTypes?: string;
  agentIds?: string;
  withAgentSlotsFactor?: boolean;
}

const agentList: ActionDefinition<Input> = {
  key: "agent-list",
  type: "read",
  title: "List Agents",
  description: "List every agent (Phantom) in the current organization.",
  params: [
    {
      key: "inputTypes",
      label: "Filter by input type",
      type: "string",
      hint: "Comma-separated resource types the agent consumes (e.g. profileUrl, companyUrl). " +
        "See agent-get's `withManifest` output for an agent's own input types.",
    },
    {
      key: "outputTypes",
      label: "Filter by output type",
      type: "string",
      hint: "Comma-separated resource types the agent produces (e.g. fullName, job, company).",
    },
    {
      key: "agentIds",
      label: "Agent IDs",
      type: "string",
      hint: "Comma-separated agent ids to restrict the list to.",
    },
    {
      key: "withAgentSlotsFactor",
      label: "Include reserved agent slots factor",
      type: "boolean",
      hint: "From the script branch configuration.",
    },
  ],
  output: [{ key: "agents", type: "object", label: "Agents" }],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const agents = await client.get("/agents/fetch-all", {
      query: {
        inputTypes: input.inputTypes,
        outputTypes: input.outputTypes,
        agentIds: input.agentIds,
        withAgentSlotsFactor: input.withAgentSlotsFactor ? "true" : undefined,
      },
    });
    return { agents };
  },
};

export default agentList;

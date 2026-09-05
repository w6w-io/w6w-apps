import type { ActionDefinition } from "@w6w/types";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /assistant/agent_configurations/search` — verified against the
 * vendor's OpenAPI document ("Search agents by name"). Name-substring search
 * only; there is no query-by-description or semantic search documented for
 * agents.
 */
interface Input {
  q: string;
}

interface Output {
  agentConfigurations: unknown[];
}

const agentSearch: ActionDefinition<Input, Output> = {
  key: "agent-search",
  type: "search",
  resource: "agent",
  title: "Search Agents",
  description: "Search agent configurations (assistants) by name.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      hint: "Matched against agent names.",
    },
  ],
  output: [{ key: "agentConfigurations", type: "array", label: "Matching agent configurations" }],

  execute(input, ctx) {
    return new DustClient(ctx).json<Output>("/assistant/agent_configurations/search", {
      query: { q: input.q },
    });
  },
};

export default agentSearch;

import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";

/**
 * `GET /agents/fetch-deleted` — every deleted agent in the current
 * organization. The vendor's OpenAPI document declares no query parameters
 * for this endpoint at all (not even a filter), so none are exposed here.
 *
 * Unlike `agent-get`, no stripping is needed: the vendor's schema for a
 * deleted-agent record carries no `proxyPassword` (or any other proxy field)
 * at all — it is a strictly smaller shape than the live-agent record.
 */
type Input = Record<string, never>;

const agentFetchDeleted: ActionDefinition<Input> = {
  key: "agent-fetch-deleted",
  type: "read",
  title: "List Deleted Agents",
  description: "List every deleted agent in the current organization.",
  params: [],
  output: [{ key: "agents", type: "array", label: "Deleted agents" }],

  async execute(_input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const agents = await client.get<unknown[]>("/agents/fetch-deleted");
    return { agents: agents ?? [] };
  },
};

export default agentFetchDeleted;

import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";
import { idParam, stripAgentSecrets } from "../lib/params.ts";

/**
 * `GET /agents/fetch` — one agent by id.
 *
 * `proxyPassword` (that agent's dedicated proxy credential, always present in
 * the vendor's schema) is stripped before returning. `argument`/`agentObject`
 * are returned as-is: see `lib/client.ts` for why this app does not attempt to
 * parse or scrub that opaque, per-agent-type JSON string. `withAgentObject`
 * and `withCode` are deliberately not exposed as params — neither is needed for
 * the launch/monitor/read workflow this app targets, and not requesting them
 * keeps a plain agent-get call as narrow as possible.
 */
interface Input {
  id: string;
  withManifest?: boolean;
}

const agentGet: ActionDefinition<Input> = {
  key: "agent-get",
  type: "read",
  title: "Get Agent",
  description: "Get one agent (Phantom) by id.",
  params: [
    idParam,
    {
      key: "withManifest",
      label: "Include manifest",
      type: "boolean",
      hint: "Include the agent's manifest — its configurable phases, input types and output types.",
    },
  ],
  output: [{ key: "agent", type: "object", label: "Agent" }],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const agent = await client.get("/agents/fetch", {
      query: {
        id: input.id,
        withManifest: input.withManifest ? "true" : undefined,
      },
    });
    return { agent: stripAgentSecrets(agent) };
  },
};

export default agentGet;

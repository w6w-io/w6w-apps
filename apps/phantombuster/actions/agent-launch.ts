import type { ActionDefinition } from "@w6w/types";
import { compact, PhantomBusterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /agents/launch` — adds an agent to the launch queue.
 *
 * The vendor's OpenAPI document declares no response body for a `200` — only
 * the description "Agent launched successfully." Rather than invent a
 * `containerId` field the spec does not promise, this returns whatever the
 * vendor actually sends (parsed if it is JSON) alongside the HTTP status, so a
 * workflow can use it if present without this app asserting a shape that
 * cannot be confirmed. Not idempotent: PhantomBuster documents no idempotency
 * key for this endpoint, and retrying always queues another run.
 */
interface Input {
  id: string;
  argument?: unknown;
  bonusArgument?: unknown;
  saveArgument?: boolean;
  manualLaunch?: boolean;
  maxInstanceCount?: number;
}

const agentLaunch: ActionDefinition<Input> = {
  key: "agent-launch",
  type: "perform",
  title: "Launch Agent",
  description: "Add an agent to the launch queue.",
  idempotent: false,
  params: [
    idParam,
    {
      key: "argument",
      label: "Argument",
      type: "json",
      hint: "Passed through to the agent as buster.argument in its script. Shape is defined by " +
        "the agent's own script, not by this API.",
    },
    {
      key: "bonusArgument",
      label: "Bonus argument",
      type: "json",
      hint: "Merged with Argument for this launch only (single-use) — the effective argument the " +
        "agent sees is the merge of the two.",
    },
    {
      key: "saveArgument",
      label: "Save argument as default",
      type: "boolean",
      hint: "If true, Argument becomes the agent's saved default launch options.",
    },
    {
      key: "manualLaunch",
      label: "Treat as manually launched",
      type: "boolean",
    },
    {
      key: "maxInstanceCount",
      label: "Max instance count",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only launch if the number of already-running instances of this agent is below this.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "response", type: "object", label: "Response body (undocumented shape)" },
  ],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const { status, body: response } = await client.postRaw(
      "/agents/launch",
      compact({
        id: input.id,
        argument: input.argument,
        bonusArgument: input.bonusArgument,
        saveArgument: input.saveArgument,
        manualLaunch: input.manualLaunch,
        maxInstanceCount: input.maxInstanceCount,
      }),
    );
    return { status, response };
  },
};

export default agentLaunch;

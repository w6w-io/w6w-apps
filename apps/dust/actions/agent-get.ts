import type { ActionDefinition } from "@w6w/types";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /assistant/agent_configurations/{sId}` — verified against the
 * vendor's OpenAPI document ("Get agent configuration").
 *
 * `variant` defaults to `light` (the vendor's own documented default) —
 * `full` additionally resolves the agent's tools/actions configuration,
 * which most callers don't need just to confirm an agent exists or read its
 * instructions.
 */
interface Input {
  sId: string;
  variant?: "light" | "full";
}

interface Output {
  agentConfiguration: unknown;
}

const agentGet: ActionDefinition<Input, Output> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Retrieve one agent configuration by its ID.",
  params: [
    { key: "sId", label: "Agent ID", type: "string", required: true },
    {
      key: "variant",
      label: "Variant",
      type: "select",
      default: "light",
      options: [
        { value: "light", label: "Light — basic config, no tools/actions" },
        { value: "full", label: "Full — includes tools/actions configuration" },
      ],
    },
  ],
  output: [{ key: "agentConfiguration", type: "object", label: "Agent configuration" }],

  execute(input, ctx) {
    return new DustClient(ctx).json<Output>(
      `/assistant/agent_configurations/${encodeURIComponent(input.sId)}`,
      { query: { variant: input.variant } },
    );
  },
};

export default agentGet;

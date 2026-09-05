import type { ActionDefinition } from "@w6w/types";
import { DeepSeekClient } from "../lib/client.ts";

/**
 * GET /models — list every model this API key can use. The authoritative
 * source for current model ids: DeepSeek has renamed its model line before
 * (e.g. the `deepseek-chat` / `deepseek-reasoner` naming this app's own
 * research superseded), so a hardcoded default anywhere in this app would go
 * stale faster than this endpoint does.
 */
const listModels: ActionDefinition<Record<string, never>> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List all DeepSeek models available to this API key.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Models" },
  ],

  execute(_input, ctx) {
    const client = new DeepSeekClient(ctx);
    return client.request("/models");
  },
};

export default listModels;

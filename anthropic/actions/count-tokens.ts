import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Message {
  role: "user" | "assistant";
  content: string | unknown[];
}

interface Input {
  model: string;
  messages: Message[];
  system?: string | unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
}

/**
 * POST /v1/messages/count_tokens — same shape as `/v1/messages` minus
 * `max_tokens` and `stream`. Returns `{ input_tokens }` so callers can decide
 * whether to send the real request.
 */
const countTokens: ActionDefinition<Input> = {
  key: "count-tokens",
  type: "read",
  resource: "message",
  title: "Count Tokens",
  description: "Count the input tokens a given prompt would consume against a Claude model.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "claude-opus-4-1-20250805",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Same shape as message-create.",
    },
    { key: "system", label: "System prompt", type: "json" },
    { key: "tools", label: "Tools", type: "json" },
    { key: "tool_choice", label: "Tool choice", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.system !== undefined) body.system = input.system;
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.tool_choice !== undefined) body.tool_choice = input.tool_choice;

    return client.request("/v1/messages/count_tokens", { method: "POST", body });
  },
};

export default countTokens;

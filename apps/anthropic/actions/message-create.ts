import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Message {
  role: "user" | "assistant";
  content: string | unknown[];
}

interface Input {
  model: string;
  messages: Message[];
  max_tokens: number;
  system?: string | unknown[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  tools?: unknown[];
  tool_choice?: unknown;
  metadata?: Record<string, unknown>;
  /** Must be false — streaming isn't modelled here; the action returns the full response. */
  stream?: boolean;
}

/**
 * POST /v1/messages — the core Claude endpoint. This action always returns the
 * fully-materialized response; streaming has to happen at the runtime layer,
 * not inside a single-shot action, so we reject `stream: true` up-front.
 */
const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Create Message",
  description: "Send a structured list of messages to Claude and get a completion.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "claude-opus-4-1-20250805",
      hint: "e.g. claude-opus-4-1-20250805, claude-sonnet-4-5, claude-haiku-4-5.",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array of `{ role, content }` objects. Roles must alternate user/assistant.",
    },
    {
      key: "max_tokens",
      label: "Max tokens",
      type: "number",
      required: true,
      default: 1024,
      hint: "Absolute upper bound on generated tokens.",
    },
    {
      key: "system",
      label: "System prompt",
      type: "json",
      hint: "String, or array of content blocks (for prompt caching etc.).",
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "top_p", label: "Top P", type: "number" },
    { key: "top_k", label: "Top K", type: "number" },
    { key: "stop_sequences", label: "Stop sequences", type: "string", repeat: true },
    { key: "tools", label: "Tools", type: "json", hint: "Tool schema array for tool use." },
    { key: "tool_choice", label: "Tool choice", type: "json" },
    { key: "metadata", label: "Metadata", type: "json" },
    {
      key: "stream",
      label: "Stream",
      type: "boolean",
      default: false,
      hint: "Must be false — streaming isn't supported by single-shot actions.",
    },
  ],

  async execute(input, ctx) {
    if (input.stream) {
      throw new Error(
        "message-create: `stream: true` isn't supported — use the runtime's streaming primitives.",
      );
    }
    const client = new AnthropicClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
      max_tokens: input.max_tokens,
    };
    if (input.system !== undefined) body.system = input.system;
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.top_p !== undefined) body.top_p = input.top_p;
    if (input.top_k !== undefined) body.top_k = input.top_k;
    if (input.stop_sequences !== undefined) body.stop_sequences = input.stop_sequences;
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.tool_choice !== undefined) body.tool_choice = input.tool_choice;
    if (input.metadata !== undefined) body.metadata = input.metadata;

    return client.request("/v1/messages", { method: "POST", body });
  },
};

export default messageCreate;

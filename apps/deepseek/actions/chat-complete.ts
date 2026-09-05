import type { ActionDefinition } from "@w6w/types";
import { DeepSeekClient } from "../lib/client.ts";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | unknown;
  name?: string;
  /** Assistant-only, Beta: force the reply to start with this message's content. */
  prefix?: boolean;
  /** Assistant-only, Beta: CoT input for Chat Prefix Completion. Requires `prefix: true`. */
  reasoning_content?: string;
  /** Tool-only: which tool call this message answers. */
  tool_call_id?: string;
}

interface Input {
  model: string;
  messages: Message[];
  thinking?: "enabled" | "disabled";
  reasoningEffort?: "low" | "high" | "max";
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  stop?: string | string[];
  temperature?: number;
  topP?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  logprobs?: boolean;
  topLogprobs?: number;
  userId?: string;
}

/**
 * POST /chat/completions — DeepSeek's core chat endpoint, OpenAI-Chat-
 * Completions-shaped. Streaming is not modeled: this action always returns
 * the fully-materialized response.
 *
 * Verified against https://api-docs.deepseek.com/api/create-chat-completion/
 * (2026-09-05). Two DeepSeek-specific controls have no OpenAI equivalent:
 *
 *   - `thinking.type` — switches a model between thinking (default) and
 *     non-thinking mode. Distinct from `reasoningEffort`, which only shapes
 *     HOW MUCH the model reasons once thinking is on.
 *   - `reasoningEffort` — `low` / `high` / `max` (DeepSeek's own scale, not
 *     OpenAI's or Groq's — do not reuse either of those apps' option lists).
 *     `medium` and `xhigh` are accepted by the API and silently mapped to
 *     `high`, so they are not offered here as distinct choices.
 *
 * `frequency_penalty` and `presence_penalty` are documented as no longer
 * supported (accepted but ignored) and are deliberately left out rather than
 * exposed as controls that do nothing.
 */
const chatComplete: ActionDefinition<Input> = {
  key: "chat-complete",
  type: "perform",
  resource: "chat",
  title: "Create Chat Completion",
  description: "Generate a chat completion from a list of messages.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      hint:
        "e.g. deepseek-v4-flash, deepseek-v4-pro — DeepSeek has renamed its model line before, " +
        "so use the `list-models` action for the current, authoritative set rather than a " +
        "hardcoded default.",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array of `{ role, content }` objects. `content` may be an array of parts for vision.",
    },
    {
      key: "thinking",
      label: "Thinking mode",
      type: "select",
      options: [
        { value: "enabled", label: "Enabled (default)" },
        { value: "disabled", label: "Disabled" },
      ],
      hint: "Whether the model reasons before answering. Not every model supports switching this.",
    },
    {
      key: "reasoningEffort",
      label: "Reasoning effort",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "high", label: "High (default)" },
        { value: "max", label: "Max" },
      ],
      showIf: { "!=": [{ "var": "thinking" }, "disabled"] },
    },
    { key: "maxTokens", label: "Max tokens", type: "number" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "json_object", label: "JSON object" },
      ],
      hint:
        "JSON Output requires instructing the model to produce JSON in a system/user message too " +
        '— otherwise the response can run on to `max_tokens` (`finish_reason: "length"`).',
    },
    { key: "stop", label: "Stop sequences", type: "string", repeat: true },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    {
      key: "tools",
      label: "Tools",
      type: "json",
      hint:
        'Array of tool definitions, e.g. [{ "type": "function", "function": { "name": "get_weather", "parameters": { … } } }]. ' +
        "Max 128 functions.",
    },
    {
      key: "toolChoice",
      label: "Tool choice",
      type: "json",
      hint:
        '`"auto"`, `"none"`, `"required"`, or a specific tool: { "type": "function", "function": { "name": "…" } }',
    },
    { key: "logprobs", label: "Log probabilities", type: "boolean" },
    {
      key: "topLogprobs",
      label: "Top log probabilities",
      type: "number",
      hint: "0-20. Requires `logprobs: true`.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Distinguishes end users on your side for content-safety, KV-cache and scheduling " +
        "isolation. `[a-zA-Z0-9-_]+`, max 512 chars. Do not put PII here.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Completion ID" },
    { key: "model", type: "string", label: "Model" },
    { key: "choices", type: "array", label: "Choices" },
    { key: "usage", type: "object", label: "Usage" },
  ],

  execute(input, ctx) {
    const client = new DeepSeekClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.thinking !== undefined) body.thinking = { type: input.thinking };
    if (input.reasoningEffort !== undefined) body.reasoning_effort = input.reasoningEffort;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.responseFormat) body.response_format = { type: input.responseFormat };
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.toolChoice !== undefined) body.tool_choice = input.toolChoice;
    if (input.logprobs !== undefined) body.logprobs = input.logprobs;
    if (input.topLogprobs !== undefined) body.top_logprobs = input.topLogprobs;
    if (input.userId !== undefined) body.user_id = input.userId;

    return client.request("/chat/completions", { method: "POST", body });
  },
};

export default chatComplete;

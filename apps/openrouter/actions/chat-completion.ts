import type { ActionDefinition } from "@w6w/types";
import { OpenRouterClient } from "../lib/client.ts";

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContentPart {
  type: "image_url";
  image_url: { url: string; detail?: string };
}

type ContentPart = TextContent | ImageContentPart;

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
}

interface Input {
  model?: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  minP?: number;
  topA?: number;
  maxTokens?: number;
  seed?: number;
  stop?: string | string[];
  responseFormat?: "text" | "json_object";
  logitBias?: Record<string, number>;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  plugins?: unknown[];
  models?: string[];
  route?: "fallback";
  provider?: unknown;
  user?: string;
}

/**
 * POST /chat/completions — OpenRouter's core endpoint, normalized to the
 * OpenAI Chat Completions shape across every provider it fronts (confirmed
 * against `openrouter.ai/docs/api_reference/overview` and the `ChatRequest` /
 * `chat/completions` operation in `openrouter.ai/openapi.json`).
 *
 * Streaming (`stream: true`) is not modeled: this action always returns the
 * fully-materialized response.
 *
 * `model` is optional on the wire (falls back to the account/key default),
 * but a workflow step almost always wants to name one explicitly, so a
 * representative default is set here. Model ids are `provider/model`
 * (e.g. `openai/gpt-5.2`, `anthropic/claude-sonnet-4.6`); see `list-models`.
 */
const chatCompletion: ActionDefinition<Input> = {
  key: "chat-completion",
  type: "perform",
  resource: "chat",
  title: "Chat Completion",
  description:
    "Generate a chat completion from any model OpenRouter routes to, using one normalized request shape.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      default: "openai/gpt-5.2",
      hint: "`provider/model`, e.g. openai/gpt-5.2, anthropic/claude-sonnet-4.6. " +
        "Omit to use the account/key default. See the List Models action.",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: 'Array of `{ role, content }` objects. `content` may be a string or, for "user" ' +
        'messages, an array of `{ type: "text" | "image_url", … }` parts.',
    },
    { key: "temperature", label: "Temperature", type: "number", hint: "Range: 0 to 2." },
    { key: "topP", label: "Top P", type: "number", hint: "Range: (0, 1]." },
    { key: "topK", label: "Top K", type: "number", hint: "Not available for OpenAI models." },
    {
      key: "frequencyPenalty",
      label: "Frequency penalty",
      type: "number",
      hint: "Range: -2 to 2.",
    },
    { key: "presencePenalty", label: "Presence penalty", type: "number", hint: "Range: -2 to 2." },
    {
      key: "repetitionPenalty",
      label: "Repetition penalty",
      type: "number",
      hint: "Range: (0, 2].",
    },
    { key: "minP", label: "Min P", type: "number", hint: "Range: 0 to 1." },
    { key: "topA", label: "Top A", type: "number", hint: "Range: 0 to 1." },
    {
      key: "maxTokens",
      label: "Max tokens",
      type: "number",
      hint: "Upper bound on generated tokens. Max is the model's context length minus the prompt.",
    },
    { key: "seed", label: "Seed", type: "number", hint: "Best-effort determinism." },
    { key: "stop", label: "Stop sequences", type: "string", repeat: true },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "json_object", label: "JSON object" },
      ],
      hint:
        "Structured `json_schema` mode isn't modeled as a form field — pass it via a workflow " +
        "expression if the model supports it.",
    },
    {
      key: "logitBias",
      label: "Logit bias",
      type: "json",
      hint: "Map of token id (string) to a bias from -100 to 100.",
    },
    {
      key: "tools",
      label: "Tools",
      type: "json",
      hint: 'Array of tool definitions, e.g. [{ "type": "function", "function": { "name": "…", ' +
        '"parameters": { … } } }].',
    },
    {
      key: "toolChoice",
      label: "Tool choice",
      type: "json",
      hint: '"none", "auto", or a specific tool.',
    },
    {
      key: "parallelToolCalls",
      label: "Parallel tool calls",
      type: "boolean",
      hint: "Set false to make the model call at most one tool per turn.",
    },
    {
      key: "plugins",
      label: "Plugins",
      type: "json",
      advanced: true,
      hint:
        'OpenRouter-only. e.g. [{ "id": "web" }] for web search, [{ "id": "file-parser" }] for ' +
        "PDF parsing.",
    },
    {
      key: "models",
      label: "Fallback models",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OpenRouter-only. Tried in order if the primary `model` is unavailable.",
    },
    {
      key: "route",
      label: "Route",
      type: "select",
      advanced: true,
      options: [{ value: "fallback", label: "Fallback" }],
      hint: "OpenRouter-only. Enables the fallback-model behavior above.",
    },
    {
      key: "provider",
      label: "Provider routing",
      type: "json",
      advanced: true,
      hint: "OpenRouter-only. Provider preferences: hosting-provider order, allow/deny lists, " +
        "and data-retention policy.",
    },
    {
      key: "user",
      label: "User",
      type: "string",
      advanced: true,
      hint: "A stable end-user identifier, used to help detect and prevent abuse.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Generation ID" },
    { key: "model", type: "string", label: "Model used" },
    { key: "choices", type: "array", label: "Choices" },
    { key: "usage", type: "object", label: "Usage" },
  ],

  execute(input, ctx) {
    const client = new OpenRouterClient(ctx);
    const body: Record<string, unknown> = { messages: input.messages };
    if (input.model !== undefined) body.model = input.model;
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.topK !== undefined) body.top_k = input.topK;
    if (input.frequencyPenalty !== undefined) body.frequency_penalty = input.frequencyPenalty;
    if (input.presencePenalty !== undefined) body.presence_penalty = input.presencePenalty;
    if (input.repetitionPenalty !== undefined) body.repetition_penalty = input.repetitionPenalty;
    if (input.minP !== undefined) body.min_p = input.minP;
    if (input.topA !== undefined) body.top_a = input.topA;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.seed !== undefined) body.seed = input.seed;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.responseFormat) body.response_format = { type: input.responseFormat };
    if (input.logitBias !== undefined) body.logit_bias = input.logitBias;
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.toolChoice !== undefined) body.tool_choice = input.toolChoice;
    if (input.parallelToolCalls !== undefined) body.parallel_tool_calls = input.parallelToolCalls;
    if (input.plugins !== undefined) body.plugins = input.plugins;
    if (input.models !== undefined) body.models = input.models;
    if (input.route !== undefined) body.route = input.route;
    if (input.provider !== undefined) body.provider = input.provider;
    if (input.user !== undefined) body.user = input.user;

    return client.request("/chat/completions", { method: "POST", body });
  },
};

export default chatCompletion;

import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: unknown;
  instructions?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  serviceTier?: "auto" | "default" | "flex";
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  reasoning?: unknown;
  text?: unknown;
  truncation?: "auto" | "disabled";
  user?: string;
}

/**
 * POST /responses — Groq's "Responses (beta)" API. It is OpenAI's Responses
 * *shape* (a single `input` rather than a `messages` array, `instructions`
 * instead of a system message) but NOT the same feature set: OpenAI's
 * Responses API is built around server-side conversation state chained via
 * `previous_response_id`, and Groq's documented schema has no such field —
 * `store` only accepts `false`/`null`. Treat every call here as stateless,
 * the same as `chat-complete`; there is nothing to chain a follow-up onto.
 */
const responseCreate: ActionDefinition<Input> = {
  key: "response-create",
  type: "perform",
  resource: "response",
  title: "Create Response (beta)",
  description:
    "Generate a model response via Groq's Responses API. Beta: no server-side conversation " +
    "state — every call is stateless, unlike OpenAI's `previous_response_id` chaining.",
  idempotent: false,
  params: [
    { key: "model", label: "Model", type: "string", required: true },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: "A string, or an array of input items (the same shape chat `messages` use).",
    },
    {
      key: "instructions",
      label: "Instructions",
      type: "text",
      hint: "Inserted as the first (system/developer) message.",
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    { key: "maxOutputTokens", label: "Max output tokens", type: "number" },
    {
      key: "serviceTier",
      label: "Service tier",
      type: "select",
      default: "auto",
      options: [
        { value: "auto", label: "Auto" },
        { value: "default", label: "Default" },
        { value: "flex", label: "Flex" },
      ],
    },
    { key: "tools", label: "Tools", type: "json" },
    { key: "toolChoice", label: "Tool choice", type: "json" },
    { key: "parallelToolCalls", label: "Parallel tool calls", type: "boolean" },
    {
      key: "reasoning",
      label: "Reasoning config",
      type: "json",
      hint: "For reasoning-capable models. See console.groq.com/docs/reasoning.",
    },
    {
      key: "text",
      label: "Text format",
      type: "json",
      hint: "Plain text or structured JSON output configuration.",
    },
    {
      key: "truncation",
      label: "Truncation",
      type: "select",
      default: "disabled",
      options: [
        { value: "auto", label: "Auto" },
        { value: "disabled", label: "Disabled" },
      ],
    },
    { key: "user", label: "User", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "output", type: "array", label: "Output items" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      input: input.input,
      // Groq's schema currently accepts only false/null for `store` — never
      // requested here, so the default (false) applies and no state is kept.
    };
    if (input.instructions !== undefined) body.instructions = input.instructions;
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.maxOutputTokens !== undefined) body.max_output_tokens = input.maxOutputTokens;
    if (input.serviceTier !== undefined) body.service_tier = input.serviceTier;
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.toolChoice !== undefined) body.tool_choice = input.toolChoice;
    if (input.parallelToolCalls !== undefined) body.parallel_tool_calls = input.parallelToolCalls;
    if (input.reasoning !== undefined) body.reasoning = input.reasoning;
    if (input.text !== undefined) body.text = input.text;
    if (input.truncation !== undefined) body.truncation = input.truncation;
    if (input.user !== undefined) body.user = input.user;

    return client.request("/responses", { method: "POST", body });
  },
};

export default responseCreate;

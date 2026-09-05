import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

interface Input {
  model: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  maxCompletionTokens?: number;
  stop?: string | string[];
  user?: string;
  seed?: number;
  responseFormat?: "text" | "json_object" | "json_schema";
  jsonSchema?: unknown;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  serviceTier?: "auto" | "on_demand" | "flex" | "performance";
  reasoningEffort?: "none" | "default" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  reasoningFormat?: "hidden" | "raw" | "parsed";
  searchSettings?: unknown;
  compoundCustom?: unknown;
}

/**
 * POST /chat/completions — OpenAI-shaped, but three params documented for
 * OpenAI compatibility are explicitly "not yet supported by any of our
 * models" per Groq's own spec and so are deliberately NOT exposed here:
 * `frequency_penalty`, `presence_penalty`, `logprobs`/`top_logprobs`,
 * `logit_bias`. Sending them is accepted (Groq echoes the field back) but has
 * no effect — modelling them as real controls would be a lie to whoever
 * fills in the form. `n` is also fixed at Groq's only supported value (1) and
 * so is left out too.
 *
 * Four fields ARE genuinely Groq-specific and have no OpenAI equivalent:
 * `serviceTier` (an `auto`/`flex`/`performance` latency-vs-availability
 * trade-off, not OpenAI's batch-oriented tiers), `reasoningEffort` /
 * `reasoningFormat` (reasoning-model controls — which values are legal
 * depends on the model, e.g. `openai/gpt-oss-*` accepts low/medium/high
 * while qwen3 models accept a different set; Groq 400s on an unsupported
 * value rather than ignoring it), and `searchSettings` / `compoundCustom`
 * (Groq's "Compound" agentic models, which can call a built-in web-search or
 * code-execution tool server-side).
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
      default: "llama-3.3-70b-versatile",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array of `{ role, content }` objects.",
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    { key: "maxCompletionTokens", label: "Max completion tokens", type: "number" },
    { key: "stop", label: "Stop", type: "string" },
    { key: "user", label: "User", type: "string" },
    { key: "seed", label: "Seed", type: "number" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "json_object", label: "JSON object" },
        { value: "json_schema", label: "JSON schema (structured outputs)" },
      ],
    },
    {
      key: "jsonSchema",
      label: "JSON schema",
      type: "json",
      showIf: { field: "responseFormat", equals: "json_schema" },
      hint:
        'The `json_schema` object Groq expects: `{ "name": "…", "schema": { … }, "strict": true }`. ' +
        "Only supported on certain models — see console.groq.com/docs/structured-outputs.",
    },
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
    {
      key: "parallelToolCalls",
      label: "Parallel tool calls",
      type: "boolean",
      hint: "Set false to make the model call at most one tool per turn.",
    },
    {
      key: "serviceTier",
      label: "Service tier",
      type: "select",
      default: "on_demand",
      options: [
        { value: "auto", label: "Auto (highest tier within your rate limits)" },
        { value: "on_demand", label: "On demand" },
        { value: "flex", label: "Flex (fails fast instead of queueing)" },
        { value: "performance", label: "Performance" },
      ],
      hint: "Groq-specific — controls latency/availability trade-offs, not OpenAI's batch tiers.",
    },
    {
      key: "reasoningEffort",
      label: "Reasoning effort",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "default", label: "Default" },
        { value: "minimal", label: "Minimal" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "xhigh", label: "Extra high" },
        { value: "max", label: "Max" },
      ],
      hint: "Which values are legal depends on the model; an unsupported value gets a 400.",
    },
    {
      key: "reasoningFormat",
      label: "Reasoning format",
      type: "select",
      options: [
        { value: "hidden", label: "Hidden" },
        { value: "raw", label: "Raw (inline in content)" },
        { value: "parsed", label: "Parsed (separate `reasoning` field)" },
      ],
    },
    {
      key: "searchSettings",
      label: "Search settings",
      type: "json",
      hint:
        'Web-search configuration for Groq\'s Compound models, e.g. { "include_domains": [...] }.',
    },
    {
      key: "compoundCustom",
      label: "Compound custom config",
      type: "json",
      hint: "Custom tool/model configuration for Groq's Compound agentic models.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Completion ID" },
    { key: "model", type: "string", label: "Model" },
    { key: "choices", type: "array", label: "Choices" },
    { key: "usage", type: "object", label: "Usage" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.maxCompletionTokens !== undefined) {
      body.max_completion_tokens = input.maxCompletionTokens;
    }
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.user !== undefined) body.user = input.user;
    if (input.seed !== undefined) body.seed = input.seed;
    if (input.responseFormat) {
      // `json_schema` is the only format that carries a payload beside the
      // type, and Groq rejects the request when it is missing — better to
      // say so here than to forward a request that cannot succeed.
      if (input.responseFormat === "json_schema") {
        if (!input.jsonSchema) {
          throw new Error(
            'Response format "json_schema" requires a `jsonSchema` value — ' +
              "the `{ name, schema, strict }` object Groq expects.",
          );
        }
        body.response_format = { type: "json_schema", json_schema: input.jsonSchema };
      } else {
        body.response_format = { type: input.responseFormat };
      }
    }
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.toolChoice !== undefined) body.tool_choice = input.toolChoice;
    if (input.parallelToolCalls !== undefined) body.parallel_tool_calls = input.parallelToolCalls;
    if (input.serviceTier !== undefined) body.service_tier = input.serviceTier;
    if (input.reasoningEffort !== undefined) body.reasoning_effort = input.reasoningEffort;
    if (input.reasoningFormat !== undefined) body.reasoning_format = input.reasoningFormat;
    if (input.searchSettings !== undefined) body.search_settings = input.searchSettings;
    if (input.compoundCustom !== undefined) body.compound_custom = input.compoundCustom;

    return client.request("/chat/completions", { method: "POST", body });
  },
};

export default chatComplete;

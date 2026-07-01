import type { ActionDefinition } from "@w6w/types";
import { MistralClient } from "../lib/client.ts";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface Input {
  model: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string | string[];
  randomSeed?: number;
  responseFormat?: "text" | "json_object";
  safePrompt?: boolean;
}

/**
 * POST /v1/chat/completions — Mistral's core chat endpoint. Streaming is not
 * modeled: this action always returns the fully-materialized response.
 */
const chatCompletion: ActionDefinition<Input> = {
  key: "chat-completion",
  type: "perform",
  resource: "chat",
  title: "Chat Completion",
  description: "Generate a chat completion from a Mistral chat model.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "mistral-large-latest",
      hint: "e.g. mistral-large-latest, mistral-small-latest, open-mistral-nemo.",
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
    { key: "maxTokens", label: "Max tokens", type: "number" },
    { key: "stop", label: "Stop sequences", type: "string", repeat: true },
    { key: "randomSeed", label: "Random seed", type: "number" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "json_object", label: "JSON object" },
      ],
    },
    { key: "safePrompt", label: "Safe prompt", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new MistralClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.randomSeed !== undefined) body.random_seed = input.randomSeed;
    if (input.responseFormat) body.response_format = { type: input.responseFormat };
    if (input.safePrompt !== undefined) body.safe_prompt = input.safePrompt;

    return client.request("/v1/chat/completions", { method: "POST", body });
  },
};

export default chatCompletion;

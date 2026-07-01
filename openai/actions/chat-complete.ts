import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

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
  n?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  user?: string;
  responseFormat?: "text" | "json_object";
  seed?: number;
}

/**
 * `messages` is required by the API but the harness passes it as an array via
 * `repeat: true` group in the future — for now callers supply a JSON array.
 * We forward it verbatim.
 */
const chatComplete: ActionDefinition<Input> = {
  key: "chat-complete",
  type: "perform",
  resource: "chat",
  title: "Create Chat Completion",
  description: "Generate a chat completion from a list of messages.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "gpt-4o-mini" },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array of `{ role, content }` objects.",
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    { key: "n", label: "Number of completions", type: "number" },
    { key: "maxTokens", label: "Max tokens", type: "number" },
    { key: "frequencyPenalty", label: "Frequency penalty", type: "number" },
    { key: "presencePenalty", label: "Presence penalty", type: "number" },
    { key: "stop", label: "Stop", type: "string" },
    { key: "user", label: "User", type: "string" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "json_object", label: "JSON object" },
      ],
    },
    { key: "seed", label: "Seed", type: "number" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.n !== undefined) body.n = input.n;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.frequencyPenalty !== undefined) body.frequency_penalty = input.frequencyPenalty;
    if (input.presencePenalty !== undefined) body.presence_penalty = input.presencePenalty;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.user !== undefined) body.user = input.user;
    if (input.seed !== undefined) body.seed = input.seed;
    if (input.responseFormat) body.response_format = { type: input.responseFormat };

    return client.request("/chat/completions", { method: "POST", body });
  },
};

export default chatComplete;

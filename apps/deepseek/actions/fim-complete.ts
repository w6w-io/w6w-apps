import type { ActionDefinition } from "@w6w/types";
import { DeepSeekClient } from "../lib/client.ts";

interface Input {
  model: string;
  prompt: string;
  suffix?: string;
  maxTokens?: number;
  stop?: string | string[];
  temperature?: number;
  topP?: number;
  echo?: boolean;
  logprobs?: number;
}

/**
 * POST /beta/completions — FIM (Fill In the Middle) completion, a Beta
 * feature reached only under the `/beta` path prefix on the SAME host
 * (`api.deepseek.com/beta`), so no extra `network.allow` entry is needed.
 *
 * Verified against https://api-docs.deepseek.com/api/create-completion/
 * (2026-09-05), which documents this against `deepseek-v4-pro` and non-
 * thinking mode only — the pricing page additionally lists it as supported
 * (non-thinking mode only) on `deepseek-v4-flash`, and explicitly NOT
 * supported on `deepseek-v4-flash-vision-exp`. The model field is left as
 * free text rather than a fixed enum since which models support FIM has
 * already changed once between those two pages.
 *
 * Like `chat-complete`, `frequency_penalty`/`presence_penalty` are
 * documented as no-ops and left out, and streaming is not modeled.
 */
const fimComplete: ActionDefinition<Input> = {
  key: "fim-complete",
  type: "perform",
  resource: "completion",
  title: "Create FIM Completion (Beta)",
  description:
    "Fill-in-the-middle text completion for a prefix (and optional suffix) — the shape code " +
    "editors use, without a chat-formatted prompt.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      hint: "Only certain models/modes support FIM — see the action description.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      hint: "The text to complete — everything before the insertion point.",
    },
    {
      key: "suffix",
      label: "Suffix",
      type: "text",
      hint: "The text that comes after the completion — everything after the insertion point.",
    },
    { key: "maxTokens", label: "Max tokens", type: "number" },
    { key: "stop", label: "Stop sequences", type: "string", repeat: true },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    {
      key: "echo",
      label: "Echo prompt",
      type: "boolean",
      hint: "Echo the prompt back in the completion.",
    },
    {
      key: "logprobs",
      label: "Log probabilities",
      type: "number",
      hint: "0-20 most likely tokens per position.",
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
      prompt: input.prompt,
    };
    if (input.suffix !== undefined) body.suffix = input.suffix;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.echo !== undefined) body.echo = input.echo;
    if (input.logprobs !== undefined) body.logprobs = input.logprobs;

    return client.request("/beta/completions", { method: "POST", body });
  },
};

export default fimComplete;

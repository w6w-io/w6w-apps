import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  body: unknown;
}

/**
 * POST /v1/chat/completions — the vendor's own summary marks this
 * "(Experimental)" and its description says: "We do not guarantee its
 * availability, scalability, or production-readiness. It may be removed or
 * changed without notice." Generates a completion with `jina-vlm`, an
 * OpenAI-compatible vision-language model.
 *
 * The spec declares NO request body schema at all for this operation (verified
 * against the raw OpenAPI document — the operation object has no
 * `requestBody` key whatsoever), only the prose "OpenAI-compatible format".
 * Every other action in this app builds a typed body from a documented
 * schema; this one can't, so it accepts a raw JSON object sent verbatim and
 * leaves shaping it (typically `{model, messages, max_tokens, ...}`,
 * OpenAI-style) to the caller.
 */
const chatCompletions: ActionDefinition<Input> = {
  key: "chat-completions",
  type: "perform",
  resource: "chat",
  idempotent: false,
  title: "Chat Completions (Experimental)",
  description: "Vendor-labelled experimental: no availability/stability guarantee. " +
    "OpenAI-compatible chat completion with jina-vlm.",
  params: [
    {
      key: "body",
      label: "Request body",
      type: "json",
      required: true,
      hint: 'OpenAI-compatible chat completion body, e.g. {"model": "jina-vlm", "messages": ' +
        '[{"role": "user", "content": "..."}]}. No schema is declared by the vendor for this ' +
        "endpoint — sent verbatim.",
    },
  ],
  output: [
    { key: "response", type: "object", label: "Raw response" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    return client.request("/v1/chat/completions", { method: "POST", body: input.body });
  },
};

export default chatCompletions;

import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";

interface Input {
  query: string;
  text?: boolean;
  model?: string;
  systemPrompt?: string;
  userLocation?: string;
  outputSchema?: Record<string, unknown>;
}

interface Citation {
  id?: string;
  url?: string;
  title?: string;
  author?: string;
  publishedDate?: string;
  text?: string;
  [key: string]: unknown;
}

interface Output {
  requestId?: string;
  answer?: string | Record<string, unknown>;
  citations?: Citation[];
  costDollars?: { total?: number };
  [key: string]: unknown;
}

/**
 * POST /answer — a direct, cited answer to a natural-language question
 * (search + synthesis in one call). `stream: true` isn't modelled: like the
 * Anthropic app's `message-create`, this action always returns the
 * fully-materialized response, so streaming is rejected up front.
 */
const answer: ActionDefinition<Input, Output> = {
  key: "answer",
  type: "perform",
  resource: "answer",
  title: "Answer",
  description: "Get a direct, cited answer to a question, synthesized from web search results.",
  idempotent: false,
  params: [
    {
      key: "query",
      label: "Question",
      type: "string",
      required: true,
      placeholder: "What is the latest valuation of SpaceX?",
    },
    {
      key: "text",
      label: "Include citation text",
      type: "boolean",
      default: false,
      hint: "Return full page text for each citation, not just its metadata.",
    },
    {
      key: "model",
      label: "Model",
      type: "select",
      default: "exa",
      options: [
        { value: "exa", label: "Exa (default)" },
        { value: "exa-pro", label: "Exa Pro" },
        { value: "exa-research", label: "Exa Research" },
        { value: "exa-fast", label: "Exa Fast" },
      ],
    },
    {
      key: "systemPrompt",
      label: "System prompt",
      type: "text",
      hint: "Additional instructions guiding the answer, e.g. source or format preferences.",
    },
    {
      key: "userLocation",
      label: "User location",
      type: "string",
      placeholder: "US",
      hint: "Two-letter ISO country code.",
    },
    {
      key: "outputSchema",
      label: "Output schema",
      type: "json",
      hint: "JSON Schema (draft-07) describing a structured answer shape. When set, `answer` is " +
        "returned as an object matching this schema instead of a plain string.",
    },
  ],
  output: [
    { key: "answer", type: "string", label: "Answer" },
    { key: "citations", type: "array", label: "Citations" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Output>("/answer", {
      method: "POST",
      body: {
        query: input.query,
        stream: false,
        text: input.text || undefined,
        model: input.model || undefined,
        systemPrompt: input.systemPrompt || undefined,
        userLocation: input.userLocation || undefined,
        outputSchema: input.outputSchema || undefined,
      },
    });
  },
};

export default answer;

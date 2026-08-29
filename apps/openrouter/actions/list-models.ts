import type { ActionDefinition } from "@w6w/types";
import { OpenRouterClient } from "../lib/client.ts";

interface Input {
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

/**
 * GET /models — "List all models and their properties" (confirmed against
 * the `/models` operation in `openrouter.ai/openapi.json`, `~77` documented
 * query filters). Only a small, generally useful subset is exposed as params
 * here — free-text search, category, and pagination — rather than every
 * pricing/benchmark filter the endpoint supports.
 */
const listModels: ActionDefinition<Input> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List models available through OpenRouter, optionally filtered by category or name.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Free-text search by model name or slug, e.g. gpt-4.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "programming", label: "Programming" },
        { value: "roleplay", label: "Roleplay" },
        { value: "marketing", label: "Marketing" },
        { value: "marketing/seo", label: "Marketing / SEO" },
        { value: "technology", label: "Technology" },
        { value: "science", label: "Science" },
        { value: "translation", label: "Translation" },
        { value: "legal", label: "Legal" },
        { value: "finance", label: "Finance" },
        { value: "health", label: "Health" },
        { value: "trivia", label: "Trivia" },
        { value: "academia", label: "Academia" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 500,
      hint: "Max records to return (max 1000).",
    },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "data", type: "array", label: "Models" },
  ],

  execute(input, ctx) {
    const client = new OpenRouterClient(ctx);
    return client.request("/models", {
      query: {
        q: input.q,
        category: input.category,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listModels;

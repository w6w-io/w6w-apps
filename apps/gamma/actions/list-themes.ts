import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/themes` — verified against `workspace/list-themes.md`.
 * Cursor-paginated: pass a previous response's `nextCursor` as `after`.
 */
interface Input {
  query?: string;
  type?: string;
  limit?: number;
  after?: string;
}

const listThemes: ActionDefinition<Input> = {
  key: "list-themes",
  type: "search",
  resource: "theme",
  title: "List Themes",
  description:
    "List themes available to the workspace — standard (built-in) and custom. Use a returned " +
    "id as themeId in a generation request.",
  params: [
    { key: "query", label: "Search Query", type: "string", hint: "Filter themes by name." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "standard", label: "Standard (built-in)" },
        { value: "custom", label: "Custom (workspace-created)" },
      ],
      hint: "Keep the same value across paginated requests.",
      advanced: true,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-50, default 20.",
      advanced: true,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "From a previous response's nextCursor.",
      advanced: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Themes — { id, name, colorKeywords, toneKeywords, type }",
    },
    { key: "hasMore", type: "boolean", label: "More results exist" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/themes", {
      query: compact({
        query: input.query,
        type: input.type,
        limit: input.limit,
        after: input.after,
      }),
    });
  },
};

export default listThemes;

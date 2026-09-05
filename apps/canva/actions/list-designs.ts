import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  query?: string;
  continuation?: string;
  ownership?: "any" | "owned" | "shared";
  sortBy?:
    | "relevance"
    | "modified_descending"
    | "modified_ascending"
    | "title_descending"
    | "title_ascending";
  limit?: number;
}

/**
 * `GET /v1/designs` — requires `design:meta:read`. Rate limited to 100
 * requests/minute per user (Canva-documented).
 */
const listDesigns: ActionDefinition<Input> = {
  key: "list-designs",
  type: "read",
  resource: "design",
  title: "List Designs",
  description: "List metadata for designs owned by, or shared with, the connected user.",
  params: [
    {
      key: "query",
      label: "Search query",
      type: "string",
      hint: "Search term(s) to filter the listed designs. Maximum length: 255.",
    },
    {
      key: "continuation",
      label: "Continuation token",
      type: "string",
      hint: "From a previous response, to fetch the next page.",
    },
    {
      key: "ownership",
      label: "Ownership",
      type: "select",
      default: "any",
      options: [
        { value: "any", label: "Owned by and shared with the user" },
        { value: "owned", label: "Owned by the user" },
        { value: "shared", label: "Shared with the user" },
      ],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "relevance",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "modified_descending", label: "Last modified (newest first)" },
        { value: "modified_ascending", label: "Last modified (oldest first)" },
        { value: "title_descending", label: "Title (Z-A)" },
        { value: "title_ascending", label: "Title (A-Z)" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
      hint: "Canva's own default is 25; maximum is 100.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Designs" },
    { key: "continuation", type: "string", label: "Continuation token" },
  ],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request("/rest/v1/designs", {
      query: {
        query: input.query,
        continuation: input.continuation,
        ownership: input.ownership,
        sort_by: input.sortBy,
        limit: input.limit,
      },
    });
  },
};

export default listDesigns;

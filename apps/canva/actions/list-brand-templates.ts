import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  query?: string;
  continuation?: string;
  limit?: number;
  ownership?: "any" | "owned" | "shared";
  sortBy?:
    | "relevance"
    | "modified_descending"
    | "modified_ascending"
    | "title_descending"
    | "title_ascending";
  dataset?: "any" | "non_empty";
}

/**
 * `GET /v1/brand-templates` — requires `brandtemplate:meta:read`. Only
 * returns results for users on a plan with brand-template access
 * (Pro/Teams/Enterprise).
 */
const listBrandTemplates: ActionDefinition<Input> = {
  key: "list-brand-templates",
  type: "read",
  resource: "brand-template",
  title: "List Brand Templates",
  description: "List the brand templates the connected user has access to.",
  params: [
    { key: "query", label: "Search query", type: "string" },
    { key: "continuation", label: "Continuation token", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
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
      key: "dataset",
      label: "Dataset filter",
      type: "select",
      default: "any",
      options: [
        { value: "any", label: "With and without autofill data fields" },
        { value: "non_empty", label: "Only templates with one or more data fields" },
      ],
      hint: "Templates with dataset definitions are the ones create-design-autofill-job can use.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Brand templates" },
    { key: "continuation", type: "string", label: "Continuation token" },
  ],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request("/rest/v1/brand-templates", {
      query: {
        query: input.query,
        continuation: input.continuation,
        limit: input.limit,
        ownership: input.ownership,
        sort_by: input.sortBy,
        dataset: input.dataset,
      },
    });
  },
};

export default listBrandTemplates;

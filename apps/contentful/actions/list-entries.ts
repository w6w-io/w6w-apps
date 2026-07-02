import type { ActionDefinition } from "@w6w/types";
import { applySearchExtras, ContentfulClient, type ContentfulListResponse, resolveScope } from "../lib/client.ts";

interface Input {
  spaceId?: string;
  environmentId?: string;
  source?: "delivery" | "preview";
  limit?: number;
  skip?: number;
  content_type?: string;
  equal?: string;
  notEqual?: string;
  include?: string;
  exclude?: string;
  exist?: string;
  select?: string;
  order?: string;
  query?: string;
}

const listEntries: ActionDefinition<Input> = {
  key: "list-entries",
  type: "read",
  resource: "entry",
  title: "List Entries",
  description: "List entries in a space/environment, optionally scoped by content type.",
  params: [
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "delivery",
      options: [
        { value: "delivery", label: "Delivery API (published)" },
        { value: "preview", label: "Preview API (drafts)" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "skip", label: "Skip", type: "number", default: 0 },
    {
      key: "content_type",
      label: "Content Type ID",
      type: "string",
      hint: "Restrict to entries of a specific content type.",
    },
    {
      key: "equal",
      label: "Equal",
      type: "string",
      placeholder: "fields.title=n8n",
      hint: "Full `attribute=value` string.",
    },
    { key: "notEqual", label: "Not Equal", type: "string", placeholder: "fields.title[ne]=n8n" },
    {
      key: "include",
      label: "Include",
      type: "string",
      placeholder: "fields.tags[in]=accessories,flowers",
    },
    {
      key: "exclude",
      label: "Exclude",
      type: "string",
      placeholder: "fields.tags[nin]=accessories,flowers",
    },
    { key: "exist", label: "Exists", type: "string", placeholder: "fields.tags[exists]=true" },
    { key: "select", label: "Select fields", type: "string", placeholder: "fields.title" },
    { key: "order", label: "Order", type: "string", placeholder: "sys.createdAt" },
    { key: "query", label: "Query (full-text)", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Entries" },
    { key: "total", type: "number", label: "Total" },
    { key: "skip", type: "number", label: "Skip" },
    { key: "limit", type: "number", label: "Limit" },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    const query: Record<string, string | number | boolean | undefined | null> = {
      limit: input.limit ?? 100,
      skip: input.skip ?? 0,
    };
    applySearchExtras(query, {
      content_type: input.content_type,
      equal: input.equal,
      notEqual: input.notEqual,
      include: input.include,
      exclude: input.exclude,
      exist: input.exist,
      select: input.select,
      order: input.order,
      query: input.query,
    });
    return client.request<ContentfulListResponse>(
      `/spaces/${spaceId}/environments/${environmentId}/entries`,
      { query, base: input.source === "preview" ? "preview" : "delivery" },
    );
  },
};

export default listEntries;

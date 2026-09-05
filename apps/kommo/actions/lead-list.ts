import type { ActionDefinition } from "@w6w/types";
import { csv, KommoClient } from "../lib/client.ts";

interface Input {
  query?: string;
  ids?: string;
  responsibleUserId?: number;
  withEmbed?: string[];
  orderBy?: string;
  orderDirection?: string;
  page?: number;
  limit?: number;
}

interface Output {
  leads: unknown[];
  page: number;
  hasMore: boolean;
}

/**
 * `GET /api/v4/leads` — verified against `leads-list`. Paging is page-based
 * (`page`/`limit`, 250 max); Kommo states no total count, so `hasMore` is
 * inferred from a page coming back exactly as full as requested.
 */
const leadList: ActionDefinition<Input, Output> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description: "List leads, optionally filtered and embedding related data.",
  params: [
    {
      key: "query",
      label: "Search Query",
      type: "string",
      hint: "Searches across the lead's filled-in fields, including custom fields.",
    },
    {
      key: "ids",
      label: "Lead IDs",
      type: "string",
      hint: "Comma-separated lead IDs to filter to.",
    },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    {
      key: "withEmbed",
      label: "Embed",
      type: "multiselect",
      options: [
        { value: "contacts", label: "Contacts" },
        { value: "loss_reason", label: "Loss reason" },
        { value: "catalog_elements", label: "Catalog elements" },
        { value: "source_id", label: "Source ID" },
        { value: "is_price_modified_by_robot", label: "Price-changed-by-robot flag" },
      ],
      hint: "Adds this related data to each lead in the response.",
    },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      default: "",
      row: "order",
      options: [
        { value: "", label: "(default)" },
        { value: "created_at", label: "Created At" },
        { value: "updated_at", label: "Updated At" },
        { value: "id", label: "ID" },
      ],
    },
    {
      key: "orderDirection",
      label: "Direction",
      type: "select",
      default: "desc",
      row: "order",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "limit", label: "Page Size", type: "number", default: 50, hint: "Max 250." },
  ],
  output: [
    { key: "leads", type: "array", label: "Leads" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "hasMore", type: "boolean", label: "Whether another page may exist" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "listing Kommo leads", { page: input.page ?? 1 });
    const { items, page, hasMore } = await new KommoClient(ctx).requestPage("/leads", "leads", {
      page: input.page,
      limit: input.limit,
      query: {
        query: input.query,
        with: input.withEmbed?.length ? input.withEmbed.join(",") : undefined,
        "filter[id][]": csv(input.ids),
        "filter[responsible_user_id][]": input.responsibleUserId
          ? [input.responsibleUserId]
          : undefined,
        ...(input.orderBy ? { [`order[${input.orderBy}]`]: input.orderDirection ?? "desc" } : {}),
      },
    });
    return { leads: items, page, hasMore };
  },
};

export default leadList;

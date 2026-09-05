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
  contacts: unknown[];
  page: number;
  hasMore: boolean;
}

/** `GET /api/v4/contacts` — verified against `contacts-list`. */
const contactList: ActionDefinition<Input, Output> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered and embedding related data.",
  params: [
    {
      key: "query",
      label: "Search Query",
      type: "string",
      hint: "Searches across the contact's filled-in fields, including custom fields.",
    },
    { key: "ids", label: "Contact IDs", type: "string", hint: "Comma-separated contact IDs." },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    {
      key: "withEmbed",
      label: "Embed",
      type: "multiselect",
      options: [
        { value: "leads", label: "Leads" },
        { value: "catalog_elements", label: "Catalog elements" },
      ],
      hint: "Adds this related data to each contact in the response.",
    },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      default: "",
      row: "order",
      options: [
        { value: "", label: "(default)" },
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
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "hasMore", type: "boolean", label: "Whether another page may exist" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "listing Kommo contacts", { page: input.page ?? 1 });
    const { items, page, hasMore } = await new KommoClient(ctx).requestPage(
      "/contacts",
      "contacts",
      {
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
      },
    );
    return { contacts: items, page, hasMore };
  },
};

export default contactList;

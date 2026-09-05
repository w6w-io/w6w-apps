import type { ActionDefinition } from "@w6w/types";
import { callWithMeta, compact } from "../lib/client.ts";
import { idsParam, pageBody, pageParams, tagsParam, updatedSinceParam } from "../lib/params.ts";

/**
 * `POST /contacts.list` — verified against
 * `developer.focus.teamleader.eu/docs/api/contacts-list` on 2026-09-01.
 */
interface Input {
  ids?: string[];
  companyId?: string;
  term?: string;
  updatedSince?: string;
  tags?: string[];
  status?: "active" | "deactivated";
  pageSize?: number;
  pageNumber?: number;
  includes?: string;
}

interface PageMeta {
  page?: { size?: number; number?: number };
  matches?: number;
}

const contactsList: ActionDefinition<Input> = {
  key: "contacts-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Get a list of contacts, optionally filtered by company, tags, status or a " +
    "free-text search term.",
  params: [
    idsParam,
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      hint: "Only contacts linked to this company. A contact whose only linked company was " +
        "deleted still counts.",
    },
    {
      key: "term",
      label: "Search term",
      type: "string",
      hint: "Filters on first name, last name, email and telephone.",
    },
    updatedSinceParam,
    tagsParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, {
        value: "deactivated",
        label: "Deactivated",
      }],
    },
    ...pageParams(),
    {
      key: "includes",
      label: "Includes",
      type: "string",
      placeholder: "custom_fields",
      hint: "Comma-separated list of optional includes.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "matches", type: "number", label: "Total matching contacts" },
  ],

  async execute(input, ctx) {
    const filter = compact({
      ids: input.ids,
      company_id: input.companyId,
      term: input.term,
      updated_since: input.updatedSince,
      tags: input.tags,
      status: input.status,
    });

    const { data, meta } = await callWithMeta<unknown[], PageMeta>(
      ctx,
      "contacts.list",
      compact({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        page: pageBody(input),
        includes: input.includes,
      }),
    );

    return { items: data ?? [], matches: meta?.matches };
  },
};

export default contactsList;

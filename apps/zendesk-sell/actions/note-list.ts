import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { idsParam, paginationParams, sortByParam } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  sortBy?: string;
  ids?: string;
  resourceType?: string;
  resourceId?: number;
  creatorId?: number;
  q?: string;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "List notes, optionally filtered.",
  params: [
    ...paginationParams(),
    sortByParam(["resource_type", "created_at", "updated_at"]),
    idsParam,
    {
      key: "resourceType",
      label: "Attached to",
      type: "select",
      options: [
        { value: "lead", label: "Lead" },
        { value: "contact", label: "Contact" },
        { value: "deal", label: "Deal" },
      ],
    },
    { key: "resourceId", label: "Resource ID", type: "number" },
    { key: "creatorId", label: "Creator user ID", type: "number" },
    { key: "q", label: "Search content", type: "string", hint: "Full-text search on content." },
  ],
  output: [
    { key: "items", type: "array", label: "Notes" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const result = await new SellClient(ctx).list(
      "/notes",
      compact({
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        ids: input.ids,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        creator_id: input.creatorId,
        q: input.q,
      }),
    );
    return { items: result.items, count: result.count };
  },
};

export default noteList;

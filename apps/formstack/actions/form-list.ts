import type { ActionDefinition } from "@w6w/types";
import { FormstackClient } from "../lib/client.ts";

/**
 * `GET /forms` — the account's forms.
 *
 * Note the pagination parameter names: **`pageNumber` and `pageSize`**. The
 * `/folders` endpoint uses `page` and `perPage` instead, and sending the wrong
 * pair is not an error — it is ignored, and you get page one forever. See
 * `lib/client.ts` for the full table.
 *
 * This is where a `formId` comes from, and every other action needs one.
 */
interface Input {
  search?: string;
  folder?: string;
  orderBy?: string;
  order?: string;
  pageNumber?: number;
  pageSize?: number;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List the account's forms, with optional search, folder filter and sorting.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Matches on form name." },
    { key: "folder", label: "Folder ID", type: "string", hint: "Only forms in this folder." },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      placeholder: "name",
      hint: "Column to sort on.",
    },
    {
      key: "order",
      label: "Direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "pageNumber",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Starts at 1. This endpoint uses `pageNumber`, not `page`.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "This endpoint uses `pageSize`, not `perPage`.",
    },
  ],
  output: [{
    key: "data",
    type: "array",
    label: "Forms — each carries the `id` other actions need",
  }],

  execute(input, ctx) {
    return new FormstackClient(ctx).request("/forms", {
      query: {
        search: input.search,
        folder: input.folder,
        orderBy: input.orderBy,
        order: input.order,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize,
      },
    });
  },
};

export default formList;

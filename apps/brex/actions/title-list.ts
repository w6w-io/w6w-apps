import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexTitle } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/titles` — every title in the account.
 *
 * The odd one out among the three directory resources: a title has an `id` and a
 * `name` and **no description**, which is Brex's shape, not an omission here.
 */
interface Input {
  name?: string;
  limit?: number;
  cursor?: string;
}

const titleList: ActionDefinition<Input> = {
  key: "title-list",
  type: "search",
  resource: "title",
  title: "List Titles",
  description: "List the account's Brex titles, optionally filtered by name.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Brex's `name` filter." },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Titles" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, or null at the end" },
    { key: "count", type: "number", label: "Titles in this page" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).list<BrexTitle>("/titles", {
      query: { name: input.name, cursor: input.cursor, limit: input.limit },
    });
  },
};

export default titleList;

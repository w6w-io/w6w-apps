import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexNamedResource } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/locations` — every location in the account.
 *
 * `name` is Brex's one filter here. Page through with `cursor` until
 * `next_cursor` comes back `null`.
 */
interface Input {
  name?: string;
  limit?: number;
  cursor?: string;
}

const locationList: ActionDefinition<Input> = {
  key: "location-list",
  type: "search",
  resource: "location",
  title: "List Locations",
  description: "List the account's Brex locations, optionally filtered by name.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Brex's `name` filter." },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Locations" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, or null at the end" },
    { key: "count", type: "number", label: "Locations in this page" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).list<BrexNamedResource>("/locations", {
      query: { name: input.name, cursor: input.cursor, limit: input.limit },
    });
  },
};

export default locationList;

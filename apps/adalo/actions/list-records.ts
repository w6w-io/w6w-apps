import type { ActionDefinition } from "@w6w/types";
import { AdaloClient, appIdFromConnection } from "../lib/client.ts";

interface Input {
  collectionId: string;
  offset?: number;
  limit?: number;
  filterKey?: string;
  filterValue?: string;
}

/**
 * `GET /v0/apps/{appId}/collections/{collectionId}` — list the records in a
 * Collection. Returns `{ records: [...] }` (confirmed by a real, shipped
 * third-party integration's response handling — this app's own credential
 * has no collection to test against live).
 *
 * `filterKey`/`filterValue` filter on a single-value property (Number, Text,
 * Boolean, Date) only — a Relationship property comes back as an array of
 * ids and can never match this way (documented explicitly on the Collections
 * API doc page: add a plain Number/Text mirror of the relationship if you
 * need to filter by it).
 */
const listRecords: ActionDefinition<Input> = {
  key: "list-records",
  type: "read",
  resource: "record",
  title: "List Records",
  description: "List the records in an Adalo Collection, optionally filtered by one property.",
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "offset", label: "Offset", type: "number", hint: "For pagination." },
    { key: "limit", label: "Limit", type: "number", hint: "Max records to return." },
    {
      key: "filterKey",
      label: "Filter field",
      type: "string",
      hint: "A single-value (Number/Text/Boolean/Date) field slug — NOT a Relationship field.",
    },
    {
      key: "filterValue",
      label: "Filter value",
      type: "string",
      hint: "Value to match against filterKey.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    const client = new AdaloClient(ctx, appIdFromConnection(ctx.connection));
    return client.request(`/collections/${encodeURIComponent(input.collectionId)}`, {
      query: {
        offset: input.offset,
        limit: input.limit,
        filterKey: input.filterKey,
        filterValue: input.filterValue,
      },
    });
  },
};

export default listRecords;

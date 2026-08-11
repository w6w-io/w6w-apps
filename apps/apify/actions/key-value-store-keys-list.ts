import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId } from "../lib/client.ts";
import { storeIdParam } from "../lib/params.ts";

/**
 * `GET /v2/key-value-stores/{storeId}/keys` — list the keys in a store.
 *
 * ## The one endpoint in the API that does not page by offset
 *
 * Apify says so explicitly: every paginated endpoint uses `offset`/`limit`
 * "the only exception is Get list of keys", which pages by
 * `exclusiveStartKey` instead. Records in a key-value store have no numeric
 * order — they are ordered by key in UTF-8 binary order — so there is no offset
 * to skip to.
 *
 * The response shape differs to match: `{limit, isTruncated, exclusiveStartKey,
 * nextExclusiveStartKey, items}` with no `total`, `count` or `offset`. To walk a
 * store, feed `nextExclusiveStartKey` back in until `isTruncated` is false.
 * There is no total to loop against.
 */
interface Input {
  storeId: string;
  prefix?: string;
  collection?: string;
  exclusiveStartKey?: string;
  limit?: number;
}

const keyValueStoreKeysList: ActionDefinition<Input> = {
  key: "key-value-store-keys-list",
  type: "search",
  resource: "key-value-store",
  title: "List Store Keys",
  description: "List the record keys in a key-value store, with their sizes.",
  params: [
    storeIdParam,
    {
      key: "prefix",
      label: "Key prefix",
      type: "string",
      hint: "Only keys starting with this string.",
    },
    {
      key: "collection",
      label: "Collection",
      type: "string",
      hint: "Only keys in this collection. Requires the store to have a schema defining one.",
    },
    {
      key: "exclusiveStartKey",
      label: "Start after key",
      type: "string",
      hint: "Skip every key up to and including this one, in UTF-8 binary order. Take it from " +
        "`nextExclusiveStartKey` in a previous response — this endpoint pages by key, not by " +
        "offset.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1 },
      hint: "Apify's own default is 1000; 100 is prefilled here.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Keys, with the size of each record" },
    { key: "isTruncated", type: "boolean", label: "Whether more keys remain" },
    { key: "nextExclusiveStartKey", type: "string", label: "Cursor for the next page" },
    { key: "limit", type: "number", label: "Effective limit" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data(`/key-value-stores/${encodeId(input.storeId)}/keys`, {
      query: {
        prefix: input.prefix,
        collection: input.collection,
        exclusiveStartKey: input.exclusiveStartKey,
        limit: input.limit,
      },
    });
  },
};

export default keyValueStoreKeysList;

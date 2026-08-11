import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient } from "../lib/client.ts";
import { collectionIdParam, searchParam } from "../lib/params.ts";

/**
 * `GET /rest/v1/filters/{collectionId}` — the counts behind a collection.
 *
 * One call returns `broken.count`, `duplicates.count`, `important.count`
 * (favorites), `notag.count`, plus a `tags` histogram and a `types` histogram.
 * That makes it the cheapest way to answer "how much of this collection needs
 * attention" without paging through the bookmarks.
 *
 * It is **not** `/raindrops/{id}/filters`. The changelog's 1.0.4 entry retires
 * that path: "Please use `/filters/:collectionId` route instead of
 * `/raindrops/:collectionId/filters`" — and the old form is still what most
 * third-party examples show.
 *
 * `search` narrows the counts to a subset, so the same endpoint answers "how
 * many broken links among my `#work` bookmarks". `tagsSort` chooses whether the
 * tag histogram comes back by count (default) or by name.
 *
 * The counts arrive at the **top level** of the envelope, not under `item`,
 * which is why this action returns the whole projection rather than one field.
 */
interface Input {
  collectionId: number;
  search?: string;
  tagsSort?: string;
}

const filterList: ActionDefinition<Input> = {
  key: "filter-list",
  type: "read",
  resource: "collection",
  title: "Get Filters",
  description:
    "Counts for a collection in one call: broken links, duplicates, favorites, untagged, plus " +
    "tag and type histograms. Use collection 0 for the whole account.",
  params: [
    collectionIdParam({
      hint: "Collection ID, or 0 for the whole account. -1 is Unsorted and -99 is Trash.",
    }),
    searchParam,
    {
      key: "tagsSort",
      label: "Tag order",
      type: "select",
      options: [
        { value: "-count", label: "Most used first (default)" },
        { value: "_id", label: "Alphabetical by name" },
      ],
    },
  ],
  output: [
    { key: "broken", type: "object", label: "Broken link count" },
    { key: "duplicates", type: "object", label: "Duplicate count" },
    { key: "important", type: "object", label: "Favorite count" },
    { key: "notag", type: "object", label: "Untagged count" },
    { key: "tags", type: "array", label: "Tag histogram" },
    { key: "types", type: "array", label: "Type histogram" },
  ],

  async execute(input, ctx) {
    const id = collectionId(input.collectionId ?? 0);
    const body = await new RaindropClient(ctx).ok(`/filters/${encodeId(id)}`, {
      query: { search: input.search, tagsSort: input.tagsSort },
    });

    return {
      broken: body.broken ?? { count: 0 },
      duplicates: body.duplicates ?? { count: 0 },
      important: body.important ?? { count: 0 },
      notag: body.notag ?? { count: 0 },
      tags: Array.isArray(body.tags) ? body.tags : [],
      types: Array.isArray(body.types) ? body.types : [],
    };
  },
};

export default filterList;

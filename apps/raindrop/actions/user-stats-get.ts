import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/user/stats` — bookmark counts, including the ones nothing else
 * reports.
 *
 * The reference files this under *Collection methods* as "Get system collections
 * count", which is where you would never look for it, and it answers two
 * questions no other endpoint does:
 *
 *  - **The system collections' sizes.** `items[]` is keyed by collection id and
 *    includes `0` (everything), `-1` (Unsorted) and `-99` (Trash) — the three
 *    ids that appear in no collection listing at all.
 *  - **Account-level counters** in `meta`: `duplicates.count`, `broken.count`,
 *    `changedBookmarksDate` and `pro`. Broken-link and duplicate counts are the
 *    two numbers a "keep the library tidy" workflow actually runs on, and this
 *    is the cheapest way to read them for the whole account. (Get Filters
 *    reports the same two per collection.)
 *
 * The response puts `items` and `meta` at the top level of the envelope rather
 * than under `item`, so both are lifted out here.
 */
const userStatsGet: ActionDefinition<Record<string, never>> = {
  key: "user-stats-get",
  type: "read",
  resource: "user",
  title: "Get Account Stats",
  description:
    "Bookmark counts per collection — including the system collections nothing else lists — plus " +
    "account-wide duplicate and broken-link counts.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Per-collection counts" },
    { key: "meta", type: "object", label: "Account counters (duplicates, broken, pro)" },
  ],

  async execute(_input, ctx) {
    const body = await new RaindropClient(ctx).ok("/user/stats");
    return {
      items: Array.isArray(body.items) ? body.items : [],
      meta: body.meta ?? {},
    };
  },
};

export default userStatsGet;

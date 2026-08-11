import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient, toIdList, toList } from "../lib/client.ts";
import { collectionIdParam, nestedParam, searchParam } from "../lib/params.ts";

/**
 * `PUT /rest/v1/raindrops/{collectionId}` — update many bookmarks at once.
 *
 * Three things here are genuinely surprising, and all three are the sort of
 * thing you find out by having done it to a live account.
 *
 * **1. `tags` APPENDS here — but `[]` wipes them.** "Will append specified tags
 * to raindrops. Or will remove all tags from raindrops if `[]` (empty array) is
 * specified." The single-raindrop endpoint *replaces* with the same field name.
 * So the same word means append on this path and replace on the other, and the
 * empty list is a third meaning again: erase. The action exposes the erase as a
 * separate explicit toggle rather than as "type nothing", because "leave the
 * field blank" and "send an empty array" must not be the same gesture. `media`
 * behaves identically and is not exposed at all (a `media` list is populated by
 * Raindrop's own parser).
 *
 * **2. Selection is by collection, and empty means everything in it.** With no
 * `ids` and no `search`, this updates *every* bookmark in the collection. That
 * is the documented behaviour, and it makes an accidentally-empty `ids` field
 * into an account-wide edit. `collectionId` is required for the same reason it
 * is on the read path.
 *
 * **3. Collection `0` does not work here.** "Warning: update or remove methods
 * not support `0` yet." The read path accepts `0` for "everything"; this one
 * does not, and the failure is refused up front rather than sent.
 *
 * Not idempotent: appending tags to a set that is *not* documented as
 * deduplicating, over a selection that may itself have changed between attempts,
 * is not a safe replay.
 */
interface Input {
  collectionId: number;
  ids?: string | Array<number | string>;
  search?: string;
  nested?: boolean;
  important?: boolean;
  tags?: string;
  removeAllTags?: boolean;
  moveToCollectionId?: number;
  cover?: string;
}

const raindropUpdateMany: ActionDefinition<Input> = {
  key: "raindrop-update-many",
  type: "perform",
  resource: "raindrop",
  title: "Update Raindrops",
  description:
    "Update many bookmarks in a collection at once. Tags are APPENDED here (unlike the single " +
    "update, which replaces). With no IDs and no search, this updates EVERY bookmark in the " +
    "collection.",
  idempotent: false,
  params: [
    collectionIdParam({
      default: undefined,
      hint: 'The collection whose bookmarks are updated. Collection 0 ("all") is NOT supported ' +
        "by the update endpoint — the vendor says so explicitly. -1 (Unsorted) and -99 (Trash) " +
        "are.",
    }),
    {
      key: "ids",
      label: "Raindrop IDs",
      type: "string",
      placeholder: "373777232, 373777233",
      hint: "Comma-separated. LEAVE EMPTY AND EVERY BOOKMARK IN THE COLLECTION IS UPDATED — " +
        "combine with a search term to narrow it.",
    },
    searchParam,
    nestedParam,
    {
      key: "important",
      label: "Favorite",
      type: "boolean",
      hint: "On marks the selection as favorite; off unmarks it.",
    },
    {
      key: "tags",
      label: "Tags to add",
      type: "string",
      hint: "Comma-separated. These are ADDED to whatever tags each bookmark already has.",
    },
    {
      key: "removeAllTags",
      label: "Remove all tags",
      type: "boolean",
      hint: 'Sends an empty tag list, which Raindrop reads as "erase every tag" on the ' +
        "selection. Overrides Tags to add.",
    },
    {
      key: "moveToCollectionId",
      label: "Move to collection",
      type: "number",
      validation: { integer: true },
      hint: "Moves the selection into another collection. Sent as `collection.$id`.",
    },
    {
      key: "cover",
      label: "Cover URL",
      type: "string",
      advanced: true,
      hint: "Set one cover for the whole selection. `<screenshot>` asks Raindrop to screenshot " +
        "each page instead.",
    },
  ],
  output: [
    { key: "modified", type: "number", label: "Bookmarks modified" },
    { key: "result", type: "boolean", label: "Updated" },
  ],

  async execute(input, ctx) {
    const id = collectionId(input.collectionId);
    if (id === 0) {
      throw new Error(
        'Raindrop\'s update endpoint does not support collection 0 ("all collections") — ' +
          "name a real collection, or -1 for Unsorted / -99 for Trash",
      );
    }

    const body: Record<string, unknown> = {};
    const ids = toIdList(input.ids);
    if (ids) body.ids = ids;
    if (typeof input.important === "boolean") body.important = input.important;
    if (input.removeAllTags === true) body.tags = [];
    else {
      const tags = toList(input.tags);
      if (tags) body.tags = tags;
    }
    if (input.cover !== undefined && input.cover !== "") body.cover = input.cover;
    if (
      typeof input.moveToCollectionId === "number" && Number.isFinite(input.moveToCollectionId)
    ) {
      body.collection = { $id: input.moveToCollectionId };
    }
    if (Object.keys(body).filter((k) => k !== "ids").length === 0) {
      throw new Error("nothing to update — set at least one of favorite, tags, cover or move-to");
    }

    const res = await new RaindropClient(ctx).ok(`/raindrops/${encodeId(id)}`, {
      method: "PUT",
      query: {
        search: input.search,
        nested: input.nested === true ? "true" : undefined,
      },
      body,
    });
    return {
      modified: typeof res.modified === "number" ? res.modified : 0,
      result: res.result !== false,
    };
  },
};

export default raindropUpdateMany;

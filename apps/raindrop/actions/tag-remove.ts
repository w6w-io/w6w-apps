import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient, toList } from "../lib/client.ts";
import { optionalCollectionIdParam } from "../lib/params.ts";

/**
 * `DELETE /rest/v1/tags[/{collectionId}]` — remove tags from bookmarks.
 *
 * The tags are stripped from every bookmark that carries them; the bookmarks
 * themselves are untouched. Since a tag's identity *is* its name, "deleting a
 * tag" is exactly this bulk untagging and nothing else.
 *
 * Scoping to a collection limits which bookmarks lose the tag — the same tag on
 * bookmarks elsewhere survives, so a collection-scoped removal does not make the
 * tag disappear from List Tags.
 *
 * The tag list goes in the request **body**, not the query string.
 *
 * Idempotent: removing a tag nothing carries changes nothing.
 */
interface Input {
  tags: string | string[];
  collectionId?: number;
}

const tagRemove: ActionDefinition<Input> = {
  key: "tag-remove",
  type: "perform",
  resource: "tag",
  title: "Remove Tags",
  description:
    "Strip one or more tags from the bookmarks carrying them. The bookmarks are kept. Optionally " +
    "limited to one collection.",
  idempotent: true,
  params: [
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      placeholder: "obsolete, draft",
      hint: "Comma-separated tag names.",
    },
    optionalCollectionIdParam(
      "Leave empty to remove the tags everywhere. Set it and only that collection's bookmarks " +
        "lose them — the tag survives elsewhere.",
    ),
  ],
  output: [{ key: "result", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const tags = toList(input.tags);
    if (!tags) throw new Error("Tags is required");

    const hasCollection = input.collectionId !== undefined && input.collectionId !== null &&
      String(input.collectionId) !== "";
    const path = hasCollection ? `/tags/${encodeId(collectionId(input.collectionId!))}` : "/tags";

    const body = await new RaindropClient(ctx).ok(path, { method: "DELETE", body: { tags } });
    return { result: body.result !== false };
  },
};

export default tagRemove;

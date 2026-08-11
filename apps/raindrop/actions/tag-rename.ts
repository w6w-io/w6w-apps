import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient, toList } from "../lib/client.ts";
import { optionalCollectionIdParam } from "../lib/params.ts";

/**
 * `PUT /rest/v1/tags[/{collectionId}]` — rename a tag, or merge several into one.
 *
 * **Rename and merge are the same request.** The reference documents them as two
 * methods, but they are one endpoint with one body — `{tags: [...], replace:
 * "new name"}` — and the only difference is how many strings are in `tags`. One
 * in, one out: a rename. Several in, one out: a merge. Shipping them as two
 * actions would be transcribing the documentation's table of contents rather
 * than the API.
 *
 * The vendor's own phrasing for the rename case makes the shared shape explicit:
 * "Specify **array** with **only one** string (name of a tag)". A bare string
 * where an array is expected is the mistake this action exists to prevent, so
 * `tags` is normalised to an array whatever arrives.
 *
 * Scoping to a collection restricts which bookmarks are re-tagged; the same tag
 * elsewhere is untouched.
 *
 * Idempotent: renaming an already-renamed tag matches nothing and changes
 * nothing.
 */
interface Input {
  tags: string | string[];
  replace: string;
  collectionId?: number;
}

const tagRename: ActionDefinition<Input> = {
  key: "tag-rename",
  type: "perform",
  resource: "tag",
  title: "Rename or Merge Tags",
  description:
    "Rename one tag, or merge several into a single name — the same endpoint either way. " +
    "Optionally limited to one collection.",
  idempotent: true,
  params: [
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      placeholder: "reading, to-read",
      hint: "Comma-separated. One tag renames it; several merge them all into the new name.",
    },
    {
      key: "replace",
      label: "New name",
      type: "string",
      required: true,
      hint: "What the listed tags become.",
    },
    optionalCollectionIdParam(
      "Leave empty to apply across every collection. Set it to re-tag only that collection's " +
        "bookmarks.",
    ),
  ],
  output: [{ key: "result", type: "boolean", label: "Renamed" }],

  async execute(input, ctx) {
    const tags = toList(input.tags);
    if (!tags) throw new Error("Tags is required");
    const replace = (input.replace ?? "").trim();
    if (!replace) throw new Error("New name is required");

    const hasCollection = input.collectionId !== undefined && input.collectionId !== null &&
      String(input.collectionId) !== "";
    const path = hasCollection ? `/tags/${encodeId(collectionId(input.collectionId!))}` : "/tags";

    const body = await new RaindropClient(ctx).ok(path, {
      method: "PUT",
      body: { tags, replace },
    });
    return { result: body.result !== false };
  },
};

export default tagRename;

import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  currentTag: string;
  tag: string;
}

/**
 * `PUT /lists/{list_id}/tags/{tag}` — rename a tag.
 *
 * The path segment is the tag's current value and the body's `tag` is the new
 * one. Because the tag string *is* the identity, this renames it everywhere it
 * is attached.
 *
 * `idempotent: true` in the useful sense: replaying the same rename lands on
 * the same state (a second replay 404s on the old name rather than renaming
 * something else).
 */
const updateTag: ActionDefinition<Input> = {
  key: "update-tag",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description:
    "Rename a tag on a list. The tag string is its identity, so the rename applies to every contact carrying it.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "currentTag",
      label: "Current tag",
      type: "string",
      required: true,
      hint: "The tag as it exists now — this is the path segment.",
    },
    { key: "tag", label: "New tag", type: "string", required: true },
  ],
  output: [{ key: "tag", type: "string", label: "The tag after the rename" }],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/tags/${seg(input.currentTag)}`,
      { method: "PUT", body: { tag: input.tag } },
    );
  },
};

export default updateTag;

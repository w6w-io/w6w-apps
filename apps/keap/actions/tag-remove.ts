import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";
import { toIdList } from "../lib/params.ts";

/**
 * `POST /rest/v2/tags/{tag_id}/contacts:removeTags` — Remove a tag from contacts.
 *
 * The mirror of `tag-apply`, and deliberately **not** symmetrical with it:
 * apply answers 200 with a per-contact result map, remove answers **204 with no
 * body at all**. So there is nothing to inspect here, and no way to learn which
 * of the supplied contacts actually had the tag. Reading a result map off this
 * response is the mistake the asymmetry invites.
 */
interface Input {
  tagId: string;
  contactIds: string;
}

const tagRemove: ActionDefinition<Input> = {
  key: "tag-remove",
  type: "perform",
  title: "Remove Tag from Contacts",
  resource: "tag",
  description: "Remove one tag from a batch of contacts.",
  // Removing a tag a contact does not have is a no-op, so a retry changes
  // nothing.
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "string",
      required: true,
      placeholder: "123,456",
      hint: "Comma-separated. Keap returns no per-contact result for removals, so this reports " +
        "only what was asked for.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "requested", type: "array", label: "Contact IDs submitted" },
  ],

  async execute(input, ctx) {
    const contactIds = toIdList(input.contactIds);
    if (contactIds.length === 0) throw new Error("At least one contact ID is required.");

    const client = new KeapClient(ctx);
    const status = await client.status(
      `${V2}/tags/${encodeId(input.tagId)}/contacts:removeTags`,
      { method: "POST", body: { contact_ids: contactIds } },
    );
    return { status, requested: contactIds };
  },
};

export default tagRemove;

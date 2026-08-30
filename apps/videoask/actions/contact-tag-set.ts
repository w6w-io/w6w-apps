import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { contactIdParam, organizationIdParam, tagIdParam } from "../lib/params.ts";

/**
 * `PATCH /contacts/{contact_id}/tags/{tag_id}` — attach or detach a tag on a
 * contact. Same path and verb for both directions; the vendor's own two
 * examples ("Add a tag to a contact", "Remove a tag from a contact") differ
 * only in the body: `{"action": "add"}` vs `{"action": "remove"}`. Returns
 * the contact's resulting tag list — `[]` after a remove that empties it, per
 * the vendor's own captured example.
 */
interface Input {
  contactId: string;
  tagId: string;
  action: "add" | "remove";
  organizationId?: string;
}

const contactTagSet: ActionDefinition<Input> = {
  key: "contact-tag-set",
  type: "perform",
  resource: "tag",
  title: "Add/Remove Contact Tag",
  description: "Attach or detach a tag on a contact.",
  idempotent: true,
  params: [
    contactIdParam,
    tagIdParam,
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "add", label: "Add tag to contact" },
        { value: "remove", label: "Remove tag from contact" },
      ],
    },
    organizationIdParam,
  ],
  output: [{ key: "tags", type: "array", label: "The contact's tags after this change" }],

  async execute(input, ctx) {
    const tags = await new VideoAskClient(ctx).entity(
      `/contacts/${encodeId(input.contactId)}/tags/${encodeId(input.tagId)}`,
      {
        method: "PATCH",
        body: { action: input.action },
        organizationId: input.organizationId,
      },
    );
    return { tags };
  },
};

export default contactTagSet;

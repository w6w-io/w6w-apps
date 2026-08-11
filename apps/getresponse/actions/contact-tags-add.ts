import type { ActionDefinition } from "@w6w/types";
import { GetResponseClient, toList } from "../lib/client.ts";

/**
 * `POST /contacts/{contactId}/tags` — tag a contact.
 *
 * Tags are referenced by **id**, not by name. List Tags is where the ids come
 * from, and Create Tag makes a new one — sending a name here is a validation
 * error rather than an implicit create.
 *
 * The body shape is `{ tags: [{ tagId }] }`, so this action takes a plain
 * comma-separated list and wraps each id.
 *
 * Idempotent: applying a tag the contact already has is not an error and does
 * not duplicate it.
 */
interface Input {
  contactId: string;
  tagIds: string;
}

const contactTagsAdd: ActionDefinition<Input> = {
  key: "contact-tags-add",
  type: "perform",
  resource: "contact",
  title: "Add Tags to Contact",
  description: "Apply one or more existing tags to a contact, by tag id.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "tagIds",
      label: "Tag IDs",
      type: "string",
      required: true,
      hint:
        "Comma-separated tag **ids** from List Tags — not names. Use Create Tag first if the tag " +
        "does not exist.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const tags = toList(input.tagIds);
    if (!tags) throw new Error("Tag IDs is empty");
    return new GetResponseClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/tags`,
      { method: "POST", body: { tags: tags.map((tagId) => ({ tagId })) } },
    );
  },
};

export default contactTagsAdd;

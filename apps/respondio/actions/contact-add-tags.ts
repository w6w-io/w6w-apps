import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `POST /contact/{identifier}/tag` — `ContactClient.addTags` in the official
 * SDK. Body is a bare `string[]` of tag names (1-10 tags, max 255 chars each,
 * per the SDK's own doc comment). Idempotent: adding a tag a contact already
 * has is a no-op, not an error.
 */
interface Input {
  identifier: string;
  tags: string[] | string;
}

const contactAddTags: ActionDefinition<Input> = {
  key: "contact-add-tags",
  type: "perform",
  resource: "contact",
  title: "Add Contact Tags",
  description: "Add one or more tags to a contact.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "1-10 tags, max 255 characters each.",
    },
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    const tags = Array.isArray(input.tags) ? input.tags : [input.tags];
    if (tags.length === 0) throw new Error("At least one tag is required");
    if (tags.length > 10) throw new Error("At most 10 tags may be added in one call");
    return new RespondioClient(ctx).post(`/contact/${identifier}/tag`, tags);
  },
};

export default contactAddTags;

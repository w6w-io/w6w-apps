import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `DELETE /contact/{identifier}/tag` — `ContactClient.deleteTags` in the
 * official SDK. Like `addTags`, the body is a bare `string[]` sent on a
 * DELETE request. Idempotent: removing a tag a contact doesn't have is a
 * no-op.
 */
interface Input {
  identifier: string;
  tags: string[] | string;
}

const contactRemoveTags: ActionDefinition<Input> = {
  key: "contact-remove-tags",
  type: "perform",
  resource: "contact",
  title: "Remove Contact Tags",
  description: "Remove one or more tags from a contact.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      required: true,
      item: { type: "string" },
    },
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    const tags = Array.isArray(input.tags) ? input.tags : [input.tags];
    if (tags.length === 0) throw new Error("At least one tag is required");
    return new RespondioClient(ctx).delete(`/contact/${identifier}/tag`, tags);
  },
};

export default contactRemoveTags;

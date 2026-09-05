import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, toList } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
  tags: string;
}

const contactTagsRemove: ActionDefinition<Input> = {
  key: "contact-tags-remove",
  type: "perform",
  resource: "contact",
  title: "Remove Tags from Contact",
  description: "Remove one or more tags from a contact, leaving any others untouched.",
  idempotent: true,
  params: [
    numericIdParam("Contact"),
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      hint: "Comma-separated, max 64 characters each.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "tags", type: "string", label: "Tags" },
  ],

  async execute(input, ctx) {
    const tags = toList(input.tags);
    if (!tags?.length) throw new Error("tags is required");
    return await new GivebutterClient(ctx).data(
      `/contacts/${encodeURIComponent(input.id)}/tags/remove`,
      { method: "POST", body: { tags } },
    );
  },
};

export default contactTagsRemove;

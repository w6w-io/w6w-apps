import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, toList } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
  tags: string;
}

const contactTagsAdd: ActionDefinition<Input> = {
  key: "contact-tags-add",
  type: "perform",
  resource: "contact",
  title: "Add Tags to Contact",
  description: "Add one or more tags to a contact, keeping any tags it already has.",
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
      `/contacts/${encodeURIComponent(input.id)}/tags/add`,
      { method: "POST", body: { tags } },
    );
  },
};

export default contactTagsAdd;

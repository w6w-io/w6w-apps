import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, toList } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
  tags: string;
}

const contactTagsSync: ActionDefinition<Input> = {
  key: "contact-tags-sync",
  type: "perform",
  resource: "contact",
  title: "Sync Tags for Contact",
  description:
    "Replace a contact's full tag set with exactly the tags given here — unlike Add/Remove, " +
    "any tag not listed is dropped.",
  idempotent: true,
  params: [
    numericIdParam("Contact"),
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      hint: "Comma-separated, max 64 characters each. This becomes the contact's complete tag set.",
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
      `/contacts/${encodeURIComponent(input.id)}/tags/sync`,
      { method: "POST", body: { tags } },
    );
  },
};

export default contactTagsSync;

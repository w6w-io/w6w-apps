import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
  tagId: number;
}

/** `POST /api/contacts/{id}/tags` — `204` on success, no response body. */
const contactTagAdd: ActionDefinition<Input> = {
  key: "contact-tag-add",
  type: "perform",
  resource: "contact",
  title: "Add Tag to Contact",
  description: "Assign a Tag to a Contact.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/contacts/${encodeURIComponent(input.id)}/tags`,
      { method: "POST", body: { tagId: input.tagId } },
    );
    return { status };
  },
};

export default contactTagAdd;

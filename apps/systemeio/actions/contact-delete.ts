import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /api/contacts/{id}` — `204` on success.
 *
 * The vendor's own POST description warns that deletion is not immediate
 * ("may take several days"), so a caller polling `contact-get` right after
 * this may still see the contact for a while.
 */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Remove a Contact resource. Actual data deletion may take several days on systeme.io's side.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/contacts/${encodeURIComponent(input.id)}`,
    );
    return { status };
  },
};

export default contactDelete;

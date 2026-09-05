import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `DELETE /api/v2/contacts/{id}` — answers `204` with no body on success. */
interface Input {
  id: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact.",
  idempotent: true,
  params: [{ key: "id", label: "Contact ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new TextMagicClient(ctx).status(
      `/contacts/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default contactDelete;

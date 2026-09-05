import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Soft-delete a contact. Use Restore Contact to undo.",
  idempotent: true,
  params: [numericIdParam("Contact")],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new GivebutterClient(ctx).status(
      `/contacts/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default contactDelete;

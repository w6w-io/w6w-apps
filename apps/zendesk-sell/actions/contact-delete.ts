import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact. Cannot be undone.",
  // Deleting an already-deleted (or never-existed) ID errors rather than
  // creating an unwanted side effect, so retrying is safe.
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new SellClient(ctx).remove(`/contacts/${encodeURIComponent(String(input.id))}`);
    return {};
  },
};

export default contactDelete;

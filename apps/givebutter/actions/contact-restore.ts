import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const contactRestore: ActionDefinition<Input> = {
  key: "contact-restore",
  type: "perform",
  resource: "contact",
  title: "Restore Contact",
  description: "Undo a soft-delete on a contact.",
  idempotent: true,
  params: [numericIdParam("Contact")],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(
      `/contacts/${encodeURIComponent(input.id)}/restore`,
      { method: "PATCH" },
    );
  },
};

export default contactRestore;

import type { ActionDefinition } from "@w6w/types";
import { contactKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `DELETE /contacts/{contactKey}`. */
interface Input {
  contactKey: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact.",
  idempotent: true,
  params: [contactKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(`/contacts/${encodeId(input.contactKey)}`);
  },
};

export default contactDelete;

import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

/** `DELETE /api/v2/contacts/{phone_number}` — deletes one contact. */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact by phone number.",
  idempotent: true,
  params: [
    { key: "phoneNumber", label: "Phone number", type: "string", required: true },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.delete(`/api/v2/contacts/${encodeURIComponent(input.phoneNumber)}`);
  },
};

export default contactDelete;

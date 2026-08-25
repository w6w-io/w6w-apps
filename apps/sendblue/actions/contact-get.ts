import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

/** `GET /api/v2/contacts/{phone_number}`. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a contact by phone number.",
  params: [
    { key: "phoneNumber", label: "Phone number", type: "string", required: true },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(`/api/v2/contacts/${encodeURIComponent(input.phoneNumber)}`);
  },
};

export default contactGet;

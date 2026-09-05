import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `GET /api/v2/contacts/{id}` — one contact's full record. */
interface Input {
  id: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact's full details.",
  params: [{ key: "id", label: "Contact ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "phone", type: "string", label: "Phone number (E.164)" },
    { key: "email", type: "string", label: "Email" },
    { key: "lists", type: "array", label: "Lists this contact belongs to" },
    { key: "blocked", type: "boolean", label: "Blocked for messaging" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/contacts/${encodeURIComponent(input.id)}`);
  },
};

export default contactGet;

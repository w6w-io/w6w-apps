import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** GET /contacts/{id}. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID (GET /contacts/{id}).",
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/contacts/${encodeURIComponent(input.id)}`);
  },
};

export default contactGet;

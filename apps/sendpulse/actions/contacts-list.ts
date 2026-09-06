import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

/**
 * `POST /crm/v1/contacts/get-list` — a POST, same as `deals-list`. Response
 * shape is `{ data: { list: Contact[], total } }` — note the array nests
 * one level deeper, and the count field is `total` not `meta.total`, unlike
 * `deals-list` on this very same API. See `deals-list`'s doc comment.
 */
const action: ActionDefinition<Input> = {
  key: "contacts-list",
  type: "search",
  resource: "contact",
  title: "List contacts",
  description: "Search contacts by name, email or phone. Response shape: " +
    "`{ data: { list: Contact[], total } }`.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Maximum 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
  ],
  output: [
    { key: "data", type: "object", label: "`{ list, total }`" },
  ],

  async execute(input, ctx) {
    const body = compact({
      limit: input.limit ?? 100,
      offset: input.offset ?? 0,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    });
    return await new SendPulseClient(ctx).crm("/contacts/get-list", { method: "POST", body });
  },
};

export default action;

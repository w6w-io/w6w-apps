import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

/**
 * `GET /v3/contacts/{id}` — the full record for one contact: profile fields,
 * owner, opt-out, call/meeting status, and custom fields. Requires
 * `contacts:read`.
 */
interface Input {
  id: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch the full record for one contact by id.",
  params: [contactIdParam],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "company", type: "string", label: "Company" },
    { key: "title", type: "string", label: "Job title" },
    { key: "isOptedOut", type: "boolean", label: "Opted out" },
    { key: "customFields", type: "array", label: "Custom fields" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).json(`/contacts/${input.id}`);
  },
};

export default contactGet;

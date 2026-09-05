import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/** `GET /v2.1/contacts/{id}` — verified against `contact_get_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  id: string | number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch data for a specific contact by id.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Full name" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "contact_number", type: "string", label: "Primary phone number" },
    { key: "email", type: "string", label: "Email" },
    { key: "company", type: "string", label: "Company" },
    { key: "other_numbers", type: "array", label: "Other phone numbers" },
    { key: "notes", type: "array", label: "Notes" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/contacts/${encodeURIComponent(String(input.id))}`);
  },
};

export default contactGet;

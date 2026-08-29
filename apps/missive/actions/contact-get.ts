import type { ActionDefinition } from "@w6w/types";
import { MissiveClient, unwrapSingle } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /v1/contacts/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Contacts, 2026-08-29.
 *
 * Fetching a deleted contact answers 404 (the vendor's own words). The
 * response envelope's shape for a single get is not shown by example in the
 * reference (only the list and create shapes are); {@link unwrapSingle}
 * handles it whether Missive answers a bare object or a one-element array.
 */
const action: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID. A deleted contact answers 404.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First Name" },
    { key: "last_name", type: "string", label: "Last Name" },
    { key: "contact_book", type: "string", label: "Contact Book ID" },
    { key: "infos", type: "array", label: "Contact Infos" },
    { key: "memberships", type: "array", label: "Memberships" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ contacts: unknown }>(
      `/contacts/${encodeURIComponent(input.id)}`,
    );
    return unwrapSingle(res.contacts);
  },
};

export default action;

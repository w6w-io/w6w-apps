import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `POST /contacts.delete` — verified against
 * `developer.focus.teamleader.eu/docs/api/contacts-delete` on 2026-09-01.
 * Body is just `{"id": "…"}`; returns `204 No Content`.
 */
interface Input {
  id: string;
}

const contactsDelete: ActionDefinition<Input> = {
  key: "contacts-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  idempotent: true,
  description: "Permanently delete a contact.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted contact ID" },
    { key: "deleted", type: "boolean", label: "True once Teamleader accepted the delete" },
  ],

  async execute(input, ctx) {
    await call(ctx, "contacts.delete", { id: input.id });
    return { id: input.id, deleted: true };
  },
};

export default contactsDelete;

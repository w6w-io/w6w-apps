import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, WrikeClient } from "../lib/client.ts";
import { rawParamsParam } from "../lib/params.ts";

/**
 * `PUT /contacts/{contactId}` — update a contact.
 *
 * **This can only update the REQUESTING user's own contact record** (or, for
 * an account admin, a group's info by group ID) — Wrike's own description:
 * "Update contact of requesting user by ID (use 'Modify User' method to
 * update other users)." Passing another person's contact ID here fails; this
 * app does not implement the separate, admin-only "Modify User" endpoint.
 */
interface Input {
  contactId: string;
  metadata?: unknown;
  rawParams?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update the requesting user's own contact record (or, for an admin, a group's info by group " +
    "ID). Cannot update another user's contact — see Wrike's separate, admin-only 'Modify User' " +
    "endpoint for that, which this app does not implement.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact",
      type: "string",
      required: true,
      hint: "Must be the requesting user's own contact ID, or a group ID (admins only).",
    },
    {
      key: "metadata",
      label: "Metadata (JSON)",
      type: "json",
      advanced: true,
      hint: 'Array of {key, value} entries, e.g. [{"key":"favoriteColor","value":"blue"}]. Only ' +
        "the requesting user's own metadata is writable.",
    },
    rawParamsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "PUT",
      query: {
        metadata: asOptionalJson(input.metadata, "Metadata"),
        ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
      },
    });
  },
};

export default contactUpdate;

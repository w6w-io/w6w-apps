import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  NutshellClient,
  type NutshellEntity,
  parseJsonObject,
  REV_PARAM,
  toId,
  VALUES_PARAM,
} from "../lib/client.ts";

interface Input {
  contactId: string | number;
  rev: string;
  name?: string;
  description?: string;
  note?: string;
  values?: unknown;
}

/**
 * `editContact(contactId, rev, contact)`.
 *
 * Nutshell's docs flag one side effect worth knowing about: "if an e-mail
 * address is modified, added, or removed, then the `lastContactedDate` and
 * `contactedCount` values in the returned contact may be inaccurate" —
 * stated here rather than worked around, since there is nothing this app can
 * correct client-side.
 */
const updateContact: ActionDefinition<Input, NutshellEntity> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Edit a Contact's name, description, or append a note. Requires the Rev from " +
    "your last read of this Contact.",
  // See update-lead.ts: a same-rev retry after success fails with 409 rather than no-op'ing.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { ...REV_PARAM },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "note",
      label: "Add note",
      type: "text",
      hint: "Appended to the Contact's existing notes. Notes cannot be removed via the API.",
    },
    { ...VALUES_PARAM },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "rev", type: "string", label: "New rev" },
  ],

  execute(input, ctx) {
    const contact = {
      ...compact({ name: input.name, description: input.description, note: input.note }),
      ...parseJsonObject(input.values, "Additional fields"),
    };

    return new NutshellClient(ctx).call<NutshellEntity>("editContact", {
      contactId: toId(input.contactId),
      rev: input.rev,
      contact,
    });
  },
};

export default updateContact;

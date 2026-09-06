import type { ActionDefinition } from "@w6w/types";
import { NutshellClient, type NutshellEntity, toId } from "../lib/client.ts";

interface Input {
  entityType: "Leads" | "Accounts" | "Contacts";
  entityId: string | number;
  note: string;
}

/**
 * `newNote(entity, note)` — log a note against a Lead, Account, or Contact.
 *
 * Nutshell's reference documents `$note` as accepting a plain string
 * directly (used here) or, "for future compatibility", an object carrying
 * `entityType: "Notes"` and a `note` key. The plain-string form is what its
 * own examples elsewhere in the reference use for adding notes via
 * `editLead`/`editAccount`/`editContact`, so it is the one this action sends.
 *
 * `idempotent: false`: each call appends a new note with no dedupe key, so a
 * retry logs the note twice.
 */
const addNote: ActionDefinition<Input, NutshellEntity> = {
  key: "add-note",
  type: "perform",
  resource: "note",
  title: "Add Note",
  description: "Log a note against a Lead, Account, or Contact.",
  idempotent: false,
  params: [
    {
      key: "entityType",
      label: "Entity type",
      type: "select",
      required: true,
      options: [
        { value: "Leads", label: "Lead" },
        { value: "Accounts", label: "Account" },
        { value: "Contacts", label: "Contact" },
      ],
    },
    { key: "entityId", label: "Entity ID", type: "string", required: true },
    { key: "note", label: "Note", type: "text", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "New Note ID" },
  ],

  execute(input, ctx) {
    return new NutshellClient(ctx).call<NutshellEntity>("newNote", {
      entity: { entityType: input.entityType, id: toId(input.entityId) },
      note: input.note,
    });
  },
};

export default addNote;

import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";

/**
 * `POST /rest/v2/contacts/{contact_id}/notes` — Create a Note.
 *
 * ## Two requirements that are easy to miss, and both are 400s
 *
 * 1. **`user_id` is the only required body property.** Not the text, not the
 *    title — the user the note is recorded against. Keap has no "system" note
 *    author, so a workflow writing notes needs a Keap user id to write them as.
 *    Get one from the List Users action.
 * 2. **Either `title` or `type` must be present.** Stated on both properties:
 *    "A value for either `title` or `type` is required." A note with only
 *    `text` is rejected.
 *
 * `type` is a small open vocabulary — Keap names `Appointment`, `Call`,
 * `Email`, `Fax`, `Letter` and `Other` — and it is what the Keap UI renders as
 * the note's icon.
 */
interface Input {
  contactId: string;
  userId: string;
  title?: string;
  type?: string;
  text?: string;
  isPinned?: boolean;
  customFields?: unknown;
}

const contactNoteCreate: ActionDefinition<Input> = {
  key: "contact-note-create",
  type: "perform",
  title: "Create Contact Note",
  resource: "note",
  description: "Record a note against a contact, attributed to a Keap user.",
  // Keap mints a new note id on every call and offers no dedupe key, so a
  // retry is a second note.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "userId",
      label: "Author user ID",
      type: "string",
      required: true,
      hint: "Required by Keap: a note always belongs to a user. Use List Users to find an id.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Either a title or a type is required.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "Appointment", label: "Appointment" },
        { value: "Call", label: "Call" },
        { value: "Email", label: "Email" },
        { value: "Fax", label: "Fax" },
        { value: "Letter", label: "Letter" },
        { value: "Other", label: "Other" },
      ],
      hint: "Either a title or a type is required. Drives the icon Keap shows on the note.",
    },
    { key: "text", label: "Text", type: "text" },
    { key: "isPinned", label: "Pin to the top of the contact record", type: "boolean" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{"id": "...", "content": ...}`. An empty array resets them all.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "create_time", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    if (!input.title && !input.type) {
      throw new Error("Keap requires a note to carry either a title or a type. Supply one.");
    }

    const body = compact({
      user_id: input.userId,
      title: input.title,
      type: input.type,
      text: input.text,
      is_pinned: input.isPinned,
      custom_fields: asOptionalJson<unknown[]>(input.customFields, "Custom fields"),
    });

    const client = new KeapClient(ctx);
    return client.json(`${V2}/contacts/${encodeId(input.contactId)}/notes`, {
      method: "POST",
      body,
    });
  },
};

export default contactNoteCreate;

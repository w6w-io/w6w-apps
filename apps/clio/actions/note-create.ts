import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact, idRef } from "../lib/client.ts";
import { fieldsParam, noteTypeOptions } from "../lib/params.ts";

/**
 * `POST /notes.json`
 *
 * **The schema's own top-level `required` array contradicts its own field
 * descriptions.** Verified in the OpenAPI document 2026-08-24: the `Note`
 * create schema's `required` list is `["contact", "matter", "type"]` — read
 * literally, both a contact AND a matter are always mandatory. But
 * `contact.id`'s own description says "Required only if the Note type is
 * `Contact`", and `matter.id`'s says "Required only if the Note type is
 * `Matter`" — i.e. exactly ONE of the two is actually needed, chosen by
 * `type`. Following the blanket `required` array literally would make it
 * impossible to file a Contact note without also inventing an unrelated
 * matter id (or vice versa). This action sends only the reference that
 * matches the chosen `type`, per the field-level rule, not the misleading
 * top-level one — worth knowing before "fixing" a 422 by sending both.
 */
interface Input {
  type: string;
  matterId?: number;
  contactId?: number;
  subject?: string;
  detail: string;
  date?: string;
  fields?: string;
}

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Create a note on a matter or a contact.",
  idempotent: false,
  params: [
    { key: "type", label: "Type", type: "select", options: noteTypeOptions, required: true },
    {
      key: "matterId",
      label: "Matter ID",
      type: "number",
      validation: { integer: true },
      hint: 'Required when Type is "Matter note"; ignored otherwise.',
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
      hint: 'Required when Type is "Contact note"; ignored otherwise.',
    },
    { key: "subject", label: "Subject", type: "string" },
    { key: "detail", label: "Detail", type: "text", required: true },
    { key: "date", label: "Date", type: "date" },
    fieldsParam("id,etag,subject,date,type"),
  ],
  output: [{ key: "data", type: "object", label: "The created note" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/notes.json", {
      method: "POST",
      query: { fields: input.fields },
      body: compact({
        type: input.type,
        // Only the reference the chosen type actually needs — see this
        // file's own doc comment for why sending both (or the wrong one)
        // would be following the schema's misleading top-level `required`.
        matter: input.type === "Matter" ? idRef(input.matterId) : undefined,
        contact: input.type === "Contact" ? idRef(input.contactId) : undefined,
        subject: input.subject,
        detail: input.detail,
        date: input.date,
      }),
    });
  },
};

export default noteCreate;

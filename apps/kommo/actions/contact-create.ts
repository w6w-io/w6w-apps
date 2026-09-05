import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, KommoClient, tagList } from "../lib/client.ts";

interface Input {
  name?: string;
  firstName?: string;
  lastName?: string;
  responsibleUserId?: number;
  tagsToAdd?: string;
  customFieldsValues?: unknown;
}

/**
 * `POST /api/v4/contacts` — verified against `add-contacts`. Same array-body,
 * id-only-response shape as leads: see `lib/client.ts`'s `createOne`.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create a Contact",
  description: "Create a new contact. Two calls with the same fields create two contacts.",
  // Kommo does not dedupe on create — two identical calls make two contacts.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Full Name",
      type: "string",
      hint: "Kommo's own display name field. Set First/Last Name separately if you want both.",
    },
    { key: "firstName", label: "First Name", type: "string", row: "name" },
    { key: "lastName", label: "Last Name", type: "string", row: "name" },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    {
      key: "tagsToAdd",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names to apply.",
    },
    {
      key: "customFieldsValues",
      label: "Custom Fields (JSON)",
      type: "json",
      advanced: true,
      hint: 'A JSON array, e.g. [{"field_id": 123, "values": [{"value": "x"}]}]. Phone/email ' +
        "are custom fields in Kommo, not top-level parameters — set them here.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New contact ID" },
    { key: "requestId", type: "string", label: "Kommo's echoed request_id" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating a Kommo contact", { name: input.name });
    const body = compact({
      name: input.name,
      first_name: input.firstName,
      last_name: input.lastName,
      responsible_user_id: input.responsibleUserId,
      tags_to_add: tagList(input.tagsToAdd),
      custom_fields_values: jsonArray(input.customFieldsValues),
    });
    const created = await new KommoClient(ctx).createOne("/contacts", "contacts", body);
    return { id: created.id, requestId: (created as { request_id?: string }).request_id };
  },
};

export default contactCreate;

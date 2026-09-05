import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, KommoClient, tagList } from "../lib/client.ts";

interface Input {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  responsibleUserId?: number;
  tagsToAdd?: string;
  tagsToDelete?: string;
  customFieldsValues?: unknown;
}

/**
 * `PATCH /api/v4/contacts/{id}` — verified against `update-contact`. As with
 * leads, the response comes back wrapped in `_embedded.contacts[0]` and
 * echoes back only `id`, `name`, `updated_at` and the delete/unsorted flags —
 * never the rest of the record.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update a Contact",
  description: "Update fields on an existing contact. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
    { key: "name", label: "Full Name", type: "string" },
    { key: "firstName", label: "First Name", type: "string", row: "name" },
    { key: "lastName", label: "Last Name", type: "string", row: "name" },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    { key: "tagsToAdd", label: "Tags to Add", type: "string", row: "tags" },
    { key: "tagsToDelete", label: "Tags to Remove", type: "string", row: "tags" },
    {
      key: "customFieldsValues",
      label: "Custom Fields (JSON)",
      type: "json",
      advanced: true,
      hint: 'A JSON array, e.g. [{"field_id": 123, "values": [{"value": "x"}]}].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "updatedAt", type: "number", label: "Unix timestamp of the update" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "updating a Kommo contact", { id: input.id });
    const body = compact({
      name: input.name,
      first_name: input.firstName,
      last_name: input.lastName,
      responsible_user_id: input.responsibleUserId,
      tags_to_add: tagList(input.tagsToAdd),
      tags_to_delete: tagList(input.tagsToDelete),
      custom_fields_values: jsonArray(input.customFieldsValues),
    });
    const updated = await new KommoClient(ctx).updateOne(
      `/contacts/${input.id}`,
      "contacts",
      body,
    );
    return { id: updated.id, updatedAt: updated.updated_at };
  },
};

export default contactUpdate;

import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
}

/**
 * Upsert = POST /contacts with `updateEnabled: true`. Brevo returns the same
 * resource on both create and update — mirrors the n8n "Create or Update"
 * operation.
 */
const upsertContact: ActionDefinition<Input> = {
  key: "upsert-contact",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description: "Create the contact if it doesn't exist, otherwise update it (sets updateEnabled).",
  params: [
    { key: "email", label: "Email", type: "string", required: true, placeholder: "name@email.com" },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      hint: "JSON object of contact attributes, e.g. `{\"FIRSTNAME\": \"Ada\"}`.",
    },
    { key: "listIds", label: "List IDs", type: "json", hint: "JSON array of list IDs." },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const body: Record<string, unknown> = { email: input.email, updateEnabled: true };
    if (input.attributes) body.attributes = input.attributes;
    if (input.listIds) body.listIds = input.listIds;
    await client.request("/contacts", { method: "POST", body });
    return { success: true };
  },
};

export default upsertContact;

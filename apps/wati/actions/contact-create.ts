import type { ActionDefinition } from "@w6w/types";
import { parseJson, WatiClient } from "../lib/client.ts";

interface Input {
  whatsappNumber: string;
  name: string;
  customParams?: unknown;
}

interface ContactDto {
  id?: string;
  wa_id?: string;
  name?: string;
  phone?: string;
  contact_status?: string;
}

/**
 * `POST /api/ext/v3/contacts` — verified against the embedded OpenAPI document 2026-09-05.
 *
 * Sends `custom_params` (snake_case) — NOT the `customParams` (camelCase) key
 * `PUT /api/ext/v3/contacts` (`contacts-update`) documents for the same concept. This is a real
 * inconsistency in Wati's own V3 schema, not a typo here — see `lib/client.ts`.
 *
 * Not marked idempotent: the OpenAPI document does not state that adding an already-existing
 * contact is a safe no-op/upsert, so a retry is treated as potentially creating a duplicate.
 */
const action: ActionDefinition<Input, ContactDto> = {
  key: "contact-create",
  type: "perform",
  resource: "contacts",
  title: "Add Contact",
  description: "Add a new contact.",
  idempotent: false,
  params: [
    {
      key: "whatsappNumber",
      label: "WhatsApp Number",
      type: "string",
      required: true,
      hint: "The contact's WhatsApp number, e.g. `1234567890`.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "customParams",
      label: "Custom Parameters",
      type: "json",
      hint: 'A JSON array of `{"name": "...", "value": "..."}` objects.',
    },
  ],
  output: [
    { key: "id", label: "Contact ID", type: "string" },
    { key: "wa_id", label: "WhatsApp ID", type: "string" },
    { key: "name", label: "Name", type: "string" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Wati contact", { whatsappNumber: input.whatsappNumber });
    return await new WatiClient(ctx).post<ContactDto>("/contacts", {
      whatsapp_number: input.whatsappNumber,
      name: input.name,
      custom_params: parseJson(input.customParams, "customParams"),
    });
  },
};

export default action;

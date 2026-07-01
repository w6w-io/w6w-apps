import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotObject } from "../lib/client.ts";
import { coerceProperties } from "../lib/crm.ts";

interface Input {
  hs_note_body: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  associations?: Array<{
    to: { id: string };
    types: Array<{ associationCategory: string; associationTypeId: number }>;
  }>;
  additionalProperties?: Record<string, unknown>;
}

/**
 * Notes are one of five "engagement" object types in HubSpot's v3 CRM. Each
 * one is a full-fledged object with its own endpoint under `/crm/v3/objects/`.
 * That's the modern shape — the n8n V2 node still hits the legacy
 * `/engagements/v1/engagements` API.
 */
const createNote: ActionDefinition<Input, HubSpotObject> = {
  key: "create-note",
  type: "perform",
  resource: "engagement",
  title: "Create Note",
  description: "Log a note engagement, optionally associated with contacts/companies/deals/tickets.",
  params: [
    { key: "hs_note_body", label: "Body", type: "text", required: true },
    { key: "hs_timestamp", label: "Timestamp", type: "datetime", hint: "Defaults to now." },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    {
      key: "associations",
      label: "Associations",
      type: "json",
      hint: "Array of `{ to: { id }, types: [{ associationCategory, associationTypeId }] }`.",
    },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const properties = coerceProperties({
      hs_note_body: input.hs_note_body,
      hs_timestamp: input.hs_timestamp ?? new Date().toISOString(),
      hubspot_owner_id: input.hubspot_owner_id,
      ...(input.additionalProperties ?? {}),
    });
    return client.request<HubSpotObject>(`/crm/v3/objects/notes`, {
      method: "POST",
      body: {
        properties,
        ...(input.associations ? { associations: input.associations } : {}),
      },
    });
  },
};

export default createNote;

import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotObject } from "../lib/client.ts";
import { coerceProperties } from "../lib/crm.ts";

interface Input {
  hs_meeting_title: string;
  hs_meeting_body?: string;
  hs_meeting_start_time?: string;
  hs_meeting_end_time?: string;
  hs_meeting_location?: string;
  hs_meeting_outcome?: string;
  hs_internal_meeting_notes?: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  associations?: unknown[];
  additionalProperties?: Record<string, unknown>;
}

const createMeeting: ActionDefinition<Input, HubSpotObject> = {
  key: "create-meeting",
  type: "perform",
  resource: "engagement",
  title: "Create Meeting",
  description: "Log a meeting engagement.",
  params: [
    { key: "hs_meeting_title", label: "Title", type: "string", required: true },
    { key: "hs_meeting_body", label: "Description", type: "text" },
    { key: "hs_meeting_start_time", label: "Start time", type: "datetime" },
    { key: "hs_meeting_end_time", label: "End time", type: "datetime" },
    { key: "hs_meeting_location", label: "Location", type: "string" },
    { key: "hs_meeting_outcome", label: "Outcome", type: "string" },
    { key: "hs_internal_meeting_notes", label: "Internal notes", type: "text" },
    { key: "hs_timestamp", label: "Activity date", type: "datetime" },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    { key: "associations", label: "Associations", type: "json" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const properties = coerceProperties({
      hs_meeting_title: input.hs_meeting_title,
      hs_meeting_body: input.hs_meeting_body,
      hs_meeting_start_time: input.hs_meeting_start_time,
      hs_meeting_end_time: input.hs_meeting_end_time,
      hs_meeting_location: input.hs_meeting_location,
      hs_meeting_outcome: input.hs_meeting_outcome,
      hs_internal_meeting_notes: input.hs_internal_meeting_notes,
      hs_timestamp: input.hs_timestamp ?? new Date().toISOString(),
      hubspot_owner_id: input.hubspot_owner_id,
      ...(input.additionalProperties ?? {}),
    });
    return client.request<HubSpotObject>(`/crm/v3/objects/meetings`, {
      method: "POST",
      body: {
        properties,
        ...(input.associations ? { associations: input.associations } : {}),
      },
    });
  },
};

export default createMeeting;

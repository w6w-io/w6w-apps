import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotObject } from "../lib/client.ts";
import { coerceProperties } from "../lib/crm.ts";

interface Input {
  hs_call_body?: string;
  hs_call_title?: string;
  hs_call_direction?: string;
  hs_call_from_number?: string;
  hs_call_to_number?: string;
  hs_call_status?: string;
  hs_call_duration?: number;
  hs_call_recording_url?: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  associations?: unknown[];
  additionalProperties?: Record<string, unknown>;
}

const createCall: ActionDefinition<Input, HubSpotObject> = {
  key: "create-call",
  type: "perform",
  resource: "engagement",
  title: "Create Call",
  description: "Log a call engagement.",
  params: [
    { key: "hs_call_title", label: "Title", type: "string" },
    { key: "hs_call_body", label: "Notes", type: "text" },
    {
      key: "hs_call_direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "INBOUND", label: "Inbound" },
        { value: "OUTBOUND", label: "Outbound" },
      ],
    },
    { key: "hs_call_from_number", label: "From number", type: "string" },
    { key: "hs_call_to_number", label: "To number", type: "string" },
    { key: "hs_call_status", label: "Status", type: "string" },
    { key: "hs_call_duration", label: "Duration (ms)", type: "number" },
    { key: "hs_call_recording_url", label: "Recording URL", type: "string" },
    { key: "hs_timestamp", label: "Timestamp", type: "datetime" },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    { key: "associations", label: "Associations", type: "json" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const properties = coerceProperties({
      hs_call_title: input.hs_call_title,
      hs_call_body: input.hs_call_body,
      hs_call_direction: input.hs_call_direction,
      hs_call_from_number: input.hs_call_from_number,
      hs_call_to_number: input.hs_call_to_number,
      hs_call_status: input.hs_call_status,
      hs_call_duration: input.hs_call_duration,
      hs_call_recording_url: input.hs_call_recording_url,
      hs_timestamp: input.hs_timestamp ?? new Date().toISOString(),
      hubspot_owner_id: input.hubspot_owner_id,
      ...(input.additionalProperties ?? {}),
    });
    return client.request<HubSpotObject>(`/crm/v3/objects/calls`, {
      method: "POST",
      body: {
        properties,
        ...(input.associations ? { associations: input.associations } : {}),
      },
    });
  },
};

export default createCall;

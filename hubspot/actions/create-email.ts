import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotObject } from "../lib/client.ts";
import { coerceProperties } from "../lib/crm.ts";

interface Input {
  hs_email_subject: string;
  hs_email_text?: string;
  hs_email_html?: string;
  hs_email_direction?: string;
  hs_email_status?: string;
  hs_email_from_email?: string;
  hs_email_to_email?: string;
  hs_email_cc?: string;
  hs_email_bcc?: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  associations?: unknown[];
  additionalProperties?: Record<string, unknown>;
}

const createEmail: ActionDefinition<Input, HubSpotObject> = {
  key: "create-email",
  type: "perform",
  resource: "engagement",
  title: "Log Email",
  description: "Log an email engagement (record only, does not send).",
  params: [
    { key: "hs_email_subject", label: "Subject", type: "string", required: true },
    { key: "hs_email_text", label: "Body (text)", type: "text" },
    { key: "hs_email_html", label: "Body (HTML)", type: "text" },
    {
      key: "hs_email_direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "EMAIL", label: "Sent" },
        { value: "INCOMING_EMAIL", label: "Received" },
      ],
    },
    { key: "hs_email_status", label: "Status", type: "string" },
    { key: "hs_email_from_email", label: "From email", type: "string" },
    { key: "hs_email_to_email", label: "To email", type: "string" },
    { key: "hs_email_cc", label: "CC", type: "string" },
    { key: "hs_email_bcc", label: "BCC", type: "string" },
    { key: "hs_timestamp", label: "Timestamp", type: "datetime" },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    { key: "associations", label: "Associations", type: "json" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const properties = coerceProperties({
      hs_email_subject: input.hs_email_subject,
      hs_email_text: input.hs_email_text,
      hs_email_html: input.hs_email_html,
      hs_email_direction: input.hs_email_direction,
      hs_email_status: input.hs_email_status,
      hs_email_from_email: input.hs_email_from_email,
      hs_email_to_email: input.hs_email_to_email,
      hs_email_cc: input.hs_email_cc,
      hs_email_bcc: input.hs_email_bcc,
      hs_timestamp: input.hs_timestamp ?? new Date().toISOString(),
      hubspot_owner_id: input.hubspot_owner_id,
      ...(input.additionalProperties ?? {}),
    });
    return client.request<HubSpotObject>(`/crm/v3/objects/emails`, {
      method: "POST",
      body: {
        properties,
        ...(input.associations ? { associations: input.associations } : {}),
      },
    });
  },
};

export default createEmail;

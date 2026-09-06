import type { ActionDefinition } from "@w6w/types";
import { encodeLeadId, yelpRequest } from "../lib/client.ts";

interface Input {
  leadId: string;
}

/**
 * `GET /v3/leads/{ID}` — the full `LeadObject`, per Yelp's OpenAPI schema.
 *
 * `temporary_email_address` is only ever returned when Yelp has enabled
 * proxy-email access for the partner, the lead is under 30 days old, AND no
 * biz user has replied yet — its absence is normal, not an error. The two
 * `temporary_phone_number*` fields are the OpenAPI schema's own
 * `deprecated: true` predecessors of `phone_number`; they are still declared
 * here because Yelp still documents returning them to partners who were
 * already receiving them, but a new integration should read `phone_number`.
 */
const getLead: ActionDefinition<Input> = {
  key: "get-lead",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Read details for a given Yelp Lead ID.",
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "business_id", type: "string", label: "Business ID" },
    { key: "conversation_id", type: "string", label: "Conversation ID" },
    { key: "temporary_email_address", type: "string", label: "Temporary reply email address" },
    {
      key: "temporary_email_address_expiry",
      type: "string",
      label: "Temporary reply email address expiry",
    },
    { key: "phone_number", type: "string", label: "Consumer phone number" },
    { key: "time_created", type: "string", label: "Time the lead was created" },
    { key: "last_event_time", type: "string", label: "Time of the last event on the lead" },
    { key: "link_to_reply_in_yelp", type: "string", label: "Direct link to reply in Yelp" },
    { key: "user", type: "object", label: "The consumer user who created the project" },
    { key: "project", type: "object", label: "The project details submitted with the lead" },
  ],

  execute(input, ctx) {
    return yelpRequest(ctx, `/leads/${encodeLeadId(input.leadId)}`);
  },
};

export default getLead;

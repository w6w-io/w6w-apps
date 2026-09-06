import type { ActionDefinition } from "@w6w/types";
import { encodeLeadId, yelpRequest } from "../lib/client.ts";

interface Input {
  leadId: string;
  replyType: "PHONE" | "EMAIL";
}

/**
 * `POST /v3/leads/{ID}/mark_as_replied` — record that the business replied to
 * the lead through a channel outside the Leads API itself (a phone call, an
 * email sent from the biz user's own inbox rather than through
 * `write-lead-event`). `reply_type` is `PHONE` or `EMAIL` — the OpenAPI
 * schema's full enum.
 *
 * ## Not idempotent — a second call is a documented error, not a no-op
 *
 * "The business user has already marked a lead as replied" is one of the
 * OpenAPI-documented 403 cases (`NOT_AUTHORIZED`), so calling this twice on
 * the same lead does not quietly repeat the first success.
 */
const markLeadAsReplied: ActionDefinition<Input> = {
  key: "mark-lead-as-replied",
  type: "perform",
  resource: "lead",
  title: "Mark Lead as Replied",
  description: "Mark a lead as replied through a channel outside the Leads API (phone or email).",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    {
      key: "replyType",
      label: "Reply medium",
      type: "select",
      required: true,
      options: [
        { value: "PHONE", label: "Phone" },
        { value: "EMAIL", label: "Email" },
      ],
    },
  ],
  output: [],

  execute(input, ctx) {
    return yelpRequest(ctx, `/leads/${encodeLeadId(input.leadId)}/mark_as_replied`, {
      method: "POST",
      body: { reply_type: input.replyType },
    });
  },
};

export default markLeadAsReplied;

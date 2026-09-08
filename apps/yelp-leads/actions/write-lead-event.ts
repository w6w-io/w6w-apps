import type { ActionDefinition } from "@w6w/types";
import { encodeLeadId, yelpRequest } from "../lib/client.ts";

interface Input {
  leadId: string;
  requestContent: string;
}

/**
 * `POST /v3/leads/{ID}/events` — write a text-message reply into an existing
 * lead. "Currently, only text messages are supported" (Yelp's own doc), and
 * the OpenAPI `WriteLeadEventRequest.request_type` enum has exactly one
 * member, `"TEXT"` — so it is sent as a fixed literal rather than exposed as
 * a choice with one option.
 *
 * A successful call answers `201` with an empty JSON object; there is
 * nothing to return beyond confirming the write.
 *
 * ## Not idempotent — Yelp itself refuses a retry
 *
 * Sending "the same successive message to the same lead within the last
 * hour" is explicitly rejected (`SAME_SUCCESSIVE_MESSAGE`), so a naive retry
 * of a genuinely-successful call does not create a duplicate message — but it
 * also does not return the original success; it errors. That is not the
 * "same result on retry" behaviour idempotency promises, so this is marked
 * `false` and a caller/retry policy should not assume a second attempt is safe
 * to send blindly.
 */
const writeLeadEvent: ActionDefinition<Input> = {
  key: "write-lead-event",
  type: "perform",
  resource: "lead",
  title: "Write Lead Event",
  description: "Send a text-message reply into an existing lead's conversation.",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    {
      key: "requestContent",
      label: "Message",
      type: "text",
      required: true,
      hint: "The text message to send. Must be non-empty.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return yelpRequest(ctx, `/leads/${encodeLeadId(input.leadId)}/events`, {
      method: "POST",
      body: { request_content: input.requestContent, request_type: "TEXT" },
    });
  },
};

export default writeLeadEvent;

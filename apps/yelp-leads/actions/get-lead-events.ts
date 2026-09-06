import type { ActionDefinition } from "@w6w/types";
import { encodeLeadId, yelpRequest } from "../lib/client.ts";

interface Input {
  leadId: string;
  olderThanCursor?: string;
  newerThanCursor?: string;
  limit?: number;
}

/**
 * `GET /v3/leads/{ID}/events` — the lead's event timeline, newest last.
 *
 * ## Order and pagination, read carefully off the vendor's own doc
 *
 * Events come back **oldest-first, newest last** — the reverse of a typical
 * "recent activity" feed — because that is reading order for a conversation.
 * `limit` (default 20, max 20, min 1) takes the *last* `limit` events shown on
 * Yelp, not the first. `older_than_cursor`/`newer_than_cursor` page by a
 * per-event `cursor` value (from a previous response), and Yelp states this
 * cursor is "not guaranteed to be unique or consistent over time" — it is a
 * pagination token, not a stable event identifier; use each event's own `id`
 * for that.
 *
 * A text message with an attachment produces **two** events sharing one `id`
 * — one `event_type: "TEXT"`, one `"ATTACHMENT_GROUPING"` — and Yelp's own
 * `limit` semantics count that pair as a single event.
 */
const getLeadEvents: ActionDefinition<Input> = {
  key: "get-lead-events",
  type: "search",
  resource: "lead",
  title: "Get Lead Events",
  description: "List the events (messages, attachments, other interactions) on a lead.",
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      hint: "Maximum number of events to return. 1-20, default 20.",
      validation: { min: 1, max: 20, integer: true },
    },
    {
      key: "olderThanCursor",
      label: "Older than cursor",
      type: "string",
      hint: "Return only events sent before this event's cursor value.",
    },
    {
      key: "newerThanCursor",
      label: "Newer than cursor",
      type: "string",
      hint: "Return only events sent after this event's cursor value.",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Lead events, oldest first" },
  ],

  execute(input, ctx) {
    return yelpRequest(ctx, `/leads/${encodeLeadId(input.leadId)}/events`, {
      query: {
        limit: input.limit,
        older_than_cursor: input.olderThanCursor,
        newer_than_cursor: input.newerThanCursor,
      },
    });
  },
};

export default getLeadEvents;

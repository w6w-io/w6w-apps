import type { ActionDefinition } from "@w6w/types";
import { compact, HoldedClient, toStringList } from "../lib/client.ts";

/**
 * `POST /events` — create a calendar event, optionally tied to a lead,
 * funnel or contact.
 *
 * The request takes `duration` (seconds); the response and every subsequent
 * read expose the resolved `endDate` instead — Holded computes it from
 * `startDate + duration` server-side, so it is not accepted back on write.
 *
 * Not idempotent: Holded issues a fresh id on every call and documents no
 * idempotency key, so a retry creates a second event.
 */
interface Input {
  name?: string;
  contactId?: string;
  contactName?: string;
  kind?: string;
  desc?: string;
  startDate?: number;
  duration?: number;
  status?: number;
  tags?: string[] | string;
  locationDesc?: string;
  leadId?: string;
  funnelId?: string;
  userId?: string;
}

const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a new calendar event.",
  idempotent: false,
  params: [
    { key: "name", label: "Event name", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string", hint: "An existing Holded contact." },
    { key: "contactName", label: "Contact name", type: "string" },
    { key: "kind", label: "Kind", type: "string", hint: 'Free text, e.g. "coffee", "call".' },
    { key: "desc", label: "Description", type: "text" },
    { key: "startDate", label: "Start date", type: "number", hint: "Unix timestamp." },
    { key: "duration", label: "Duration", type: "number", hint: "Seconds." },
    { key: "status", label: "Status", type: "number" },
    { key: "tags", label: "Tags", type: "multiselect", hint: "Free-text tags." },
    { key: "locationDesc", label: "Location", type: "string" },
    { key: "leadId", label: "Lead ID", type: "string", hint: "Ties this event to a lead." },
    { key: "funnelId", label: "Funnel ID", type: "string" },
    { key: "userId", label: "Assigned user ID", type: "string" },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "New event ID" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      contactId: input.contactId,
      contactName: input.contactName,
      kind: input.kind,
      desc: input.desc,
      startDate: input.startDate,
      duration: input.duration,
      status: input.status,
      tags: toStringList(input.tags),
      locationDesc: input.locationDesc,
      leadId: input.leadId,
      funnelId: input.funnelId,
      userId: input.userId,
    });
    return new HoldedClient(ctx).write("/events", "POST", body);
  },
};

export default eventCreate;

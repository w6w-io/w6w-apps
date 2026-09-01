import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoldedClient, toStringList } from "../lib/client.ts";

/**
 * `PUT /events/{eventId}` — update an event. "Only the params included in
 * the operation will update the event" — a partial update, and the reason
 * this is idempotent.
 */
interface Input {
  eventId: string;
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

const eventUpdate: ActionDefinition<Input> = {
  key: "event-update",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Update a calendar event. Unset fields are left unchanged.",
  idempotent: true,
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Events result.",
    },
    { key: "name", label: "Event name", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "contactName", label: "Contact name", type: "string" },
    { key: "kind", label: "Kind", type: "string" },
    { key: "desc", label: "Description", type: "text" },
    { key: "startDate", label: "Start date", type: "number", hint: "Unix timestamp." },
    { key: "duration", label: "Duration", type: "number", hint: "Seconds." },
    { key: "status", label: "Status", type: "number" },
    { key: "tags", label: "Tags", type: "multiselect", hint: "Free-text tags." },
    { key: "locationDesc", label: "Location", type: "string" },
    { key: "leadId", label: "Lead ID", type: "string" },
    { key: "funnelId", label: "Funnel ID", type: "string" },
    { key: "userId", label: "Assigned user ID", type: "string" },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Event ID" },
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
    return new HoldedClient(ctx).write(`/events/${encodeId(input.eventId)}`, "PUT", body);
  },
};

export default eventUpdate;

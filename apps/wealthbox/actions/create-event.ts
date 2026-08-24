import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  title: string;
  startsAt: string;
  endsAt: string;
  repeats?: boolean;
  eventCategory?: number;
  allDay?: boolean;
  location?: string;
  description?: string;
  state?: string;
  visibleTo?: string;
  emailInvitees?: boolean;
  linkedTo?: unknown[];
  invitees?: unknown[];
  additionalProperties?: Record<string, unknown>;
}

/**
 * `POST /v1/events` — create a calendar Event.
 *
 * Not idempotent: Wealthbox mints a new event id per call with no idempotency
 * key on this endpoint, so a retry creates a duplicate.
 */
const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a calendar Event.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "startsAt", label: "Starts at", type: "datetime", required: true },
    { key: "endsAt", label: "Ends at", type: "datetime", required: true },
    { key: "repeats", label: "Repeats", type: "boolean" },
    { key: "eventCategory", label: "Event category ID", type: "number" },
    { key: "allDay", label: "All day", type: "boolean" },
    { key: "location", label: "Location", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "unconfirmed", label: "Unconfirmed" },
        { value: "confirmed", label: "Confirmed" },
        { value: "tentative", label: "Tentative" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "visibleTo",
      label: "Visible to",
      type: "string",
      hint: '"Everyone", "Private", or a user-group id.',
    },
    { key: "emailInvitees", label: "Email invitees", type: "boolean" },
    {
      key: "linkedTo",
      label: "Linked to",
      type: "json",
      hint: 'Array of `{"id": 1, "type": "Contact"}` — only Contact is supported.',
    },
    {
      key: "invitees",
      label: "Invitees",
      type: "json",
      hint: 'Array of `{"id": 1, "type": "Contact"}` or `{"id": 1, "type": "User"}`.',
    },
    ADDITIONAL_PROPERTIES_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Event ID" }],

  execute(input, ctx) {
    const body = {
      ...compact({
        title: input.title,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        repeats: input.repeats,
        event_category: input.eventCategory,
        all_day: input.allDay,
        location: input.location,
        description: input.description,
        state: input.state,
        visible_to: input.visibleTo,
        email_invitees: input.emailInvitees,
        linked_to: input.linkedTo,
        invitees: input.invitees,
      }),
      ...(input.additionalProperties ?? {}),
    };
    return new WealthboxClient(ctx).request("/events", { method: "POST", body });
  },
};

export default createEvent;

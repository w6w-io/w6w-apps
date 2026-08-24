import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  eventId: number;
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
 * `PUT /v1/events/{id}` — update a calendar Event.
 *
 * dev.wealthbox.com marks `title`, `starts_at` and `ends_at` **required** on
 * this endpoint, identically to Create — this is not a partial patch the way
 * Contact's PUT is. This action follows that literally: leaving them out
 * risks a rejected update rather than a safe no-op.
 *
 * Idempotent: applying the same field values twice leaves the Event in the
 * same state, so a retry after a network failure is safe.
 */
const updateEvent: ActionDefinition<Input> = {
  key: "update-event",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description:
    "Update an existing Event. Wealthbox requires resending `title`, `starts_at` and `ends_at` " +
    "on every update.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "number", required: true },
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
    return new WealthboxClient(ctx).request(`/events/${encodeURIComponent(input.eventId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateEvent;

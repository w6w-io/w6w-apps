import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

/**
 * `GET /organizers/{organizerKey}/webinars/{webinarKey}/attendees` — attendance across every
 * session of a webinar (who actually joined, not who registered).
 *
 * Wrapped under `_embedded.attendeeParticipationResponses`.
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  page?: number;
  size?: number;
}

const attendeeList: ActionDefinition<Input> = {
  key: "attendee-list",
  type: "search",
  resource: "attendee",
  title: "List Attendees",
  description: "List attendance across all of a webinar's sessions.",
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "page", label: "Page", type: "number", default: 0, hint: "Zero-indexed." },
    { key: "size", label: "Page size", type: "number" },
  ],
  output: [{ key: "attendees", type: "array", label: "Attendees" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const body = await new GotoWebinarClient(ctx).request<
      { _embedded?: { attendeeParticipationResponses?: unknown[] } }
    >(`/organizers/${organizerKey}/webinars/${input.webinarKey}/attendees`, {
      query: { page: input.page, size: input.size },
    });
    return { attendees: body?._embedded?.attendeeParticipationResponses ?? [] };
  },
};

export default attendeeList;

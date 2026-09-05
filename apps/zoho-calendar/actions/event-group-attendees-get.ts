import type { ActionDefinition } from "@w6w/types";
import { calendarUid, eventUid } from "../lib/params.ts";
import { ZohoCalendarClient } from "../lib/client.ts";

interface Input {
  calendarUid: string;
  eventUid: string;
  groupId: string;
}

/**
 * `GET /calendars/<uid>/events/<uid>/groupattendeestatus` — RSVP/photo detail for the members of a
 * group invited to an event (as opposed to `dateandtime.attendees`' individually-invited people).
 */
const eventGroupAttendeesGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "event-group-attendees-get",
  type: "read",
  resource: "event",
  title: "Get Group Attendees",
  description: "Get the RSVP status of one invited group's members for an event.",
  params: [
    calendarUid,
    eventUid,
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      hint: "The group's zuid, from the event's `group_list`.",
    },
  ],
  output: [{ key: "GRP_MEM_OBJ", type: "object", label: "Members, keyed by zuid" }],

  execute(input, ctx) {
    return new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(input.calendarUid)}/events/` +
        `${encodeURIComponent(input.eventUid)}/groupattendeestatus`,
      { query: { groupId: input.groupId } },
    );
  },
};

export default eventGroupAttendeesGet;

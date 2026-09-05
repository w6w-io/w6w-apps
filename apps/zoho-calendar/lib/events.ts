/**
 * Shared helpers for the Events endpoints (`/api/v1/calendars/<uid>/events...`) — see
 * `lib/client.ts` for the write-payload-as-query-parameter and error-envelope findings that shape
 * every one of these.
 *
 * ## `PUT` (Update Event) REPLACES the whole event, it does not patch
 *
 * Zoho's own doc for `put-update-event.html` states it plainly: "The update operation replaces the
 * entire event resource, overwriting all existing fields with the values provided in the request."
 * Unlike Update Calendar (a genuine partial patch — send only what changed), sending
 * `event-update` with just a new `title` risks clearing `location`, `attendees`, `reminders` and
 * everything else the event already had. `actions/event-update.ts` requires the same mandatory
 * `dateandtime` fields Create Event does and documents this loudly, but it cannot prevent a caller
 * from omitting a field they meant to keep — there is no vendor-side partial-update path to fall
 * back to.
 */
import type { HookContext } from "@w6w/types";
import { compact, jsonParam, parseJsonParam, unwrapFirst, ZohoCalendarClient } from "./client.ts";

function eventsPath(calendarUid: string, suffix = ""): string {
  return `/calendars/${encodeURIComponent(calendarUid)}/events${suffix}`;
}

export interface EventDataInput {
  title?: string;
  start?: string;
  end?: string;
  timezone?: string;
  isAllDay?: boolean;
  isPrivate?: boolean;
  url?: string;
  location?: string;
  description?: string;
  richTextDescription?: string;
  color?: string;
  attendees?: unknown;
  groupAttendees?: unknown;
  reminders?: unknown;
  calendarAlarm?: boolean;
  notifyAttendee?: number;
  transparency?: number;
  allowForwarding?: boolean;
  rrule?: string;
  repeat?: unknown;
}

/** Build the `eventdata` JSON object shared by Create Event and Update Event. */
export function buildEventData(input: EventDataInput): Record<string, unknown> {
  const dateandtime = compact({
    start: input.start,
    end: input.end,
    timezone: input.timezone,
  });
  return compact({
    title: input.title,
    dateandtime: Object.keys(dateandtime).length > 0 ? dateandtime : undefined,
    isallday: input.isAllDay,
    isprivate: input.isPrivate,
    url: input.url,
    location: input.location,
    description: input.description,
    richtext_description: input.richTextDescription,
    color: input.color,
    attendees: parseJsonParam(input.attendees, "attendees"),
    group_attendees: parseJsonParam(input.groupAttendees, "groupAttendees"),
    reminders: parseJsonParam(input.reminders, "reminders"),
    calendar_alarm: input.calendarAlarm,
    notify_attendee: input.notifyAttendee,
    transparency: input.transparency,
    allowForwarding: input.allowForwarding,
    rrule: input.rrule,
    repeat: parseJsonParam(input.repeat, "repeat"),
  });
}

function requireStartEnd(data: Record<string, unknown>): void {
  const dt = data.dateandtime as Record<string, unknown> | undefined;
  if (!dt?.start || !dt?.end) {
    throw new Error("`start` and `end` are both required.");
  }
}

export async function createEvent(
  ctx: HookContext,
  calendarUid: string,
  input: EventDataInput,
): Promise<Record<string, unknown>> {
  const data = buildEventData(input);
  requireStartEnd(data);
  const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
    eventsPath(calendarUid),
    { method: "POST", query: { eventdata: jsonParam(data) } },
  );
  return unwrapFirst(body, "events", "create event");
}

export interface UpdateEventInput extends EventDataInput {
  etag: string;
  recurrenceId?: string;
  recurrenceEditType?: "following" | "only" | "all";
  isRep?: boolean;
  rmAttachId?: string;
}

export async function updateEvent(
  ctx: HookContext,
  calendarUid: string,
  eventUid: string,
  input: UpdateEventInput,
): Promise<Record<string, unknown>> {
  const data = {
    ...buildEventData(input),
    ...compact({
      etag: input.etag,
      recurrenceid: input.recurrenceId,
      recurrence_edittype: input.recurrenceEditType,
      isrep: input.isRep,
      rmAttachId: input.rmAttachId,
    }),
  };
  requireStartEnd(data);
  if (!data.etag) throw new Error("`etag` is required to update an event.");
  const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
    eventsPath(calendarUid, `/${encodeURIComponent(eventUid)}`),
    { method: "PUT", query: { eventdata: jsonParam(data) } },
  );
  return unwrapFirst(body, "events", "update event");
}

export interface EventListInput {
  start: string;
  end: string;
  byInstance?: boolean;
  timezone?: string;
  crmEventType?: "own" | "all";
}

export async function listEvents(
  ctx: HookContext,
  calendarUid: string,
  input: EventListInput,
): Promise<Record<string, unknown>[]> {
  if (!input.start || !input.end) throw new Error("`start` and `end` are both required.");
  const body = await new ZohoCalendarClient(ctx).request<{ events?: Record<string, unknown>[] }>(
    eventsPath(calendarUid),
    {
      query: {
        range: jsonParam({ start: input.start, end: input.end }),
        byinstance: input.byInstance,
        timezone: input.timezone,
        crm_event_type: input.crmEventType,
      },
    },
  );
  return body.events ?? [];
}

export async function getEvent(
  ctx: HookContext,
  calendarUid: string,
  eventUid: string,
  recurrenceId?: string,
): Promise<Record<string, unknown>> {
  const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
    eventsPath(calendarUid, `/${encodeURIComponent(eventUid)}`),
    { query: { recurrenceid: recurrenceId } },
  );
  return unwrapFirst(body, "events", "get event");
}

export interface DeleteEventInput {
  etag: string;
  recurrenceId?: string;
  recurrenceEditType?: "following" | "only";
  notifyAttendee?: number;
}

export async function deleteEvent(
  ctx: HookContext,
  calendarUid: string,
  eventUid: string,
  input: DeleteEventInput,
): Promise<Record<string, unknown>> {
  if (!input.etag) throw new Error("`etag` is required to delete an event.");
  const eventdata = compact({
    uid: eventUid,
    etag: input.etag,
    recurrenceid: input.recurrenceId,
    recurrence_edittype: input.recurrenceEditType,
    notify_attendee: input.notifyAttendee,
  });
  const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
    eventsPath(calendarUid, `/${encodeURIComponent(eventUid)}`),
    { method: "DELETE", query: { eventdata: jsonParam(eventdata) } },
  );
  return unwrapFirst(body, "events", "delete event");
}

/**
 * Shared helpers for the five Calendars endpoints (`/api/v1/calendars...`) — see
 * `lib/client.ts` for the write-payload-as-query-parameter and error-envelope findings that shape
 * every one of these.
 */
import type { HookContext } from "@w6w/types";
import { compact, jsonParam, parseJsonParam, unwrapFirst, ZohoCalendarClient } from "./client.ts";

/** The optional fields shared by Create Calendar and Update Calendar — see `lib/params.ts`. */
export interface CalendarDataInput {
  name?: string;
  color?: string;
  description?: string;
  textcolor?: string;
  timezone?: string;
  includeInFreebusy?: boolean;
  private?: string;
  public?: string;
  reminders?: unknown;
  status?: boolean;
}

/** Build the `calendarData` JSON object from an action's flat input. */
export function buildCalendarData(input: CalendarDataInput): Record<string, unknown> {
  return compact({
    name: input.name,
    color: input.color,
    description: input.description,
    textcolor: input.textcolor,
    timezone: input.timezone,
    include_infreebusy: input.includeInFreebusy,
    private: input.private,
    public: input.public,
    reminders: parseJsonParam(input.reminders, "reminders"),
    status: input.status,
  });
}

export async function createCalendar(
  ctx: HookContext,
  input: CalendarDataInput,
): Promise<Record<string, unknown>> {
  const data = buildCalendarData(input);
  if (!data.name || !data.color) {
    throw new Error("`name` and `color` are both required to create a calendar.");
  }
  const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>("/calendars", {
    method: "POST",
    query: { calendarData: jsonParam(data) },
  });
  return unwrapFirst(body, "calendars", "create calendar");
}

export async function updateCalendar(
  ctx: HookContext,
  calendarUid: string,
  input: CalendarDataInput,
): Promise<Record<string, unknown>> {
  const data = buildCalendarData(input);
  if (Object.keys(data).length === 0) {
    throw new Error("Provide at least one field to update.");
  }
  const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
    `/calendars/${encodeURIComponent(calendarUid)}`,
    { method: "PUT", query: { calendarData: jsonParam(data) } },
  );
  return unwrapFirst(body, "calendars", "update calendar");
}

import type { ActionDefinition } from "@w6w/types";
import { ZohoCalendarClient } from "../lib/client.ts";

interface Input {
  email: string;
  start: string;
  end: string;
  type?: "eventbased" | "timebased";
}

/**
 * `GET /calendars/freebusy` — the one Calendars-family endpoint with no `<uid>` path segment at
 * all; it reports across every one of the target user's calendars.
 */
const freebusyGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "freebusy-get",
  type: "read",
  resource: "freebusy",
  title: "Get Free/Busy",
  description: "Get a user's free/busy schedule across all their calendars.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The user whose availability to check, e.g. user@domain.com.",
    },
    {
      key: "start",
      label: "Start",
      type: "string",
      required: true,
      hint: "yyyyMMdd'T'HHmmss, e.g. 20170419T080000.",
    },
    {
      key: "end",
      label: "End",
      type: "string",
      required: true,
      hint: "yyyyMMdd'T'HHmmss, e.g. 20170419T080000.",
    },
    {
      key: "type",
      label: "Report type",
      type: "select",
      options: [
        { value: "eventbased", label: "Event-based (default) — lists busy events" },
        { value: "timebased", label: "Time-based — lists busy time ranges per day" },
      ],
    },
  ],
  output: [{ key: "freebusy", type: "object", label: "Free/busy details, keyed by date" }],

  execute(input, ctx) {
    return new ZohoCalendarClient(ctx).request<Record<string, unknown>>("/calendars/freebusy", {
      query: { uemail: input.email, sdate: input.start, edate: input.end, ftype: input.type },
    });
  },
};

export default freebusyGet;

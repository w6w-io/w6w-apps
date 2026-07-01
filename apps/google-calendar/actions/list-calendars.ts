import type { ActionDefinition } from "@w6w/types";
import { GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  maxResults?: number;
  pageToken?: string;
  showHidden?: boolean;
  minAccessRole?: "freeBusyReader" | "reader" | "writer" | "owner";
}

/**
 * List calendars visible to the authenticated user (`users/me/calendarList`).
 * n8n exposed this only via a listSearch dropdown; we surface it as a proper
 * action so callers can enumerate calendars in a workflow.
 */
const listCalendars: ActionDefinition<Input> = {
  key: "list-calendars",
  type: "read",
  resource: "calendar",
  title: "List Calendars",
  description:
    "List the calendars in the authenticated user's calendar list. Returns one page; pass `pageToken` for the next.",
  params: [
    { key: "maxResults", label: "Max results", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "showHidden", label: "Include hidden", type: "boolean", default: false },
    {
      key: "minAccessRole",
      label: "Minimum access role",
      type: "select",
      options: [
        { value: "freeBusyReader", label: "Free/busy reader" },
        { value: "reader", label: "Reader" },
        { value: "writer", label: "Writer" },
        { value: "owner", label: "Owner" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Calendars" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    return client.request("/users/me/calendarList", {
      query: {
        maxResults: input.maxResults ?? 100,
        pageToken: input.pageToken,
        showHidden: input.showHidden,
        minAccessRole: input.minAccessRole,
      },
    });
  },
};

export default listCalendars;

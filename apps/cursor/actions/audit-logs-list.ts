import type { ActionDefinition } from "@w6w/types";
import { CursorClient, toList } from "../lib/client.ts";

interface Input {
  startDate?: number;
  endDate?: number;
  eventTypes?: string[] | string;
  users?: string[] | string;
  page?: number;
  pageSize?: number;
}

/**
 * `GET /teams/audit-logs` — team activity, security events and configuration
 * changes.
 *
 * Rate limited to 20 requests/minute per team. Unlike every other date-range
 * endpoint in this app, `startDate`/`endDate` here default server-side (7
 * days ago / now) when omitted, so both params are optional. `users` accepts
 * a mix of email addresses and encoded user ids, comma-separated; the vendor
 * caps the date range at 30 days, so a longer window needs multiple requests.
 */
const auditLogsList: ActionDefinition<Input> = {
  key: "audit-logs-list",
  type: "read",
  resource: "audit-log",
  title: "List Audit Logs",
  description:
    "Retrieve audit log events for your team with filtering. Track team activity, security " +
    "events, and configuration changes. The vendor caps a single request's date range at 30 days.",
  params: [
    {
      key: "startDate",
      label: "Start date",
      type: "number",
      hint: "Epoch milliseconds. Defaults to 7 days ago.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "endDate",
      label: "End date",
      type: "number",
      hint: "Epoch milliseconds. Defaults to now.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "multiselect",
      hint: "e.g. login, add_user. Leave empty for every event type.",
      options: [
        { value: "login", label: "login" },
        { value: "add_user", label: "add_user" },
        { value: "remove_user", label: "remove_user" },
      ],
    },
    {
      key: "users",
      label: "Users",
      type: "string",
      hint: "Comma-separated email addresses and/or encoded user ids to filter by.",
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 100,
      hint: "Results per page.",
      validation: { integer: true, min: 1, max: 500 },
    },
  ],
  output: [
    { key: "events", type: "array", label: "Audit log events" },
    { key: "pagination", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).get("/teams/audit-logs", {
      startDate: input.startDate,
      endDate: input.endDate,
      eventTypes: toList(input.eventTypes),
      users: toList(input.users),
      page: input.page,
      pageSize: input.pageSize,
    });
  },
};

export default auditLogsList;

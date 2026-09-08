import { compact } from "./client.ts";
import type { QueryValue } from "./client.ts";

/** The Session list filter set shared by `GET /sessions` and `GET /events/{id}/sessions`. */
export interface SessionFilterInput {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  createdSince?: string;
  createdUntil?: string;
  updatedSince?: string;
  updatedUntil?: string;
  includeBreakoutRooms?: boolean;
}

export const SESSION_FILTER_PARAMS = [
  {
    key: "status",
    label: "Filter: status",
    type: "select" as const,
    options: [
      { label: "Upcoming", value: "upcoming" },
      { label: "Live", value: "live" },
      { label: "On demand", value: "on_demand" },
      { label: "Past", value: "past" },
      { label: "Past, not started", value: "past_not_started" },
      { label: "Canceled", value: "canceled" },
      { label: "Draft", value: "draft" },
    ],
  },
  {
    key: "dateFrom",
    label: "Filter: date from",
    type: "string" as const,
    hint: "Unix timestamp or ISO 8601 date, matched against estimated_started_at.",
  },
  { key: "dateTo", label: "Filter: date to", type: "string" as const },
  { key: "createdSince", label: "Filter: created since", type: "string" as const },
  { key: "createdUntil", label: "Filter: created until", type: "string" as const },
  { key: "updatedSince", label: "Filter: updated since", type: "string" as const },
  { key: "updatedUntil", label: "Filter: updated until", type: "string" as const },
  {
    key: "includeBreakoutRooms",
    label: "Filter: include breakout rooms",
    type: "boolean" as const,
  },
];

export function sessionFilters(input: SessionFilterInput): Record<string, QueryValue> {
  return compact({
    "filter[status]": input.status,
    "filter[date_from]": input.dateFrom,
    "filter[date_to]": input.dateTo,
    "filter[created_since]": input.createdSince,
    "filter[created_until]": input.createdUntil,
    "filter[updated_since]": input.updatedSince,
    "filter[updated_until]": input.updatedUntil,
    "filter[include_breakout_rooms]": input.includeBreakoutRooms,
  }) as Record<string, QueryValue>;
}

/** The Session write attribute set shared by `PATCH`/`PUT /sessions/{id}`. */
export interface SessionAttributesInput {
  name?: string;
  estimatedStartedAt?: string;
  timezone?: string;
}

export const SESSION_ATTRIBUTE_PARAMS = [
  { key: "name", label: "Session name", type: "string" as const },
  {
    key: "estimatedStartedAt",
    label: "Estimated start",
    type: "string" as const,
    hint: 'e.g. "2020-11-28 10:30:00".',
  },
  { key: "timezone", label: "Timezone", type: "string" as const, hint: 'e.g. "America/New_York".' },
];

export function sessionAttributes(input: SessionAttributesInput): Record<string, unknown> {
  return compact({
    name: input.name,
    estimated_started_at: input.estimatedStartedAt,
    timezone: input.timezone,
  });
}

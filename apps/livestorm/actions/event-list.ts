import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

/** `GET /events` — list the workspace's events, with server-side filtering. */
interface Input {
  pageNumber?: number;
  pageSize?: number;
  title?: string;
  everyoneCanSpeak?: boolean;
  schedulingStatus?: string;
  createdSince?: string;
  createdUntil?: string;
  updatedSince?: string;
  updatedUntil?: string;
  tag?: string;
  include?: string;
}

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "List the events (webinars/meetings) in your workspace.",
  params: [
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    { key: "title", label: "Filter: title", type: "string" },
    { key: "everyoneCanSpeak", label: "Filter: everyone can speak", type: "boolean" },
    {
      key: "schedulingStatus",
      label: "Filter: scheduling status",
      type: "select",
      options: [
        { label: "Live", value: "live" },
        { label: "Upcoming", value: "upcoming" },
        { label: "On demand", value: "on_demand" },
        { label: "Ended", value: "ended" },
        { label: "Not started", value: "not_started" },
        { label: "Draft", value: "draft" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Not scheduled", value: "not_scheduled" },
      ],
    },
    {
      key: "createdSince",
      label: "Filter: created since",
      type: "string",
      hint: "Unix timestamp or ISO 8601 date.",
    },
    { key: "createdUntil", label: "Filter: created until", type: "string" },
    { key: "updatedSince", label: "Filter: updated since", type: "string" },
    { key: "updatedUntil", label: "Filter: updated until", type: "string" },
    {
      key: "tag",
      label: "Filter: tag",
      type: "string",
      hint: "Case-insensitive; comma-separated for multiple.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [{ label: "Sessions", value: "sessions" }, { label: "Tags", value: "tags" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Events" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>("/events", {
      query: {
        ...listQuery(input),
        ...compact({
          "filter[title]": input.title,
          "filter[everyone_can_speak]": input.everyoneCanSpeak,
          "filter[scheduling_status]": input.schedulingStatus,
          "filter[created_since]": input.createdSince,
          "filter[created_until]": input.createdUntil,
          "filter[updated_since]": input.updatedSince,
          "filter[updated_until]": input.updatedUntil,
          "filter[tag]": input.tag,
        }),
      },
    });
  },
};

export default eventList;

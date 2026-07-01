import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  organizationId: string;
  status?: string;
  nameFilter?: string;
  timeFilter?: "current_future" | "past" | "all";
  showSeriesParent?: boolean;
  pageSize?: number;
  continuation?: string;
  expand?: string;
}

const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "List events for an organization. Walks one page; pass back `continuation` to get the next.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Comma-separated, e.g. `live,draft`. Defaults to `live`.",
      default: "live",
    },
    { key: "nameFilter", label: "Name filter", type: "string" },
    {
      key: "timeFilter",
      label: "Time filter",
      type: "select",
      options: [
        { value: "current_future", label: "Current + future" },
        { value: "past", label: "Past" },
        { value: "all", label: "All" },
      ],
    },
    { key: "showSeriesParent", label: "Include series parents", type: "boolean", default: false },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "continuation", label: "Continuation token", type: "string" },
    { key: "expand", label: "Expand", type: "string", default: "venue,ticket_classes" },
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"events">>(
      `/organizations/${input.organizationId}/events/`,
      {
        query: {
          status: input.status ?? "live",
          name_filter: input.nameFilter,
          time_filter: input.timeFilter,
          show_series_parent: input.showSeriesParent,
          page_size: input.pageSize ?? 100,
          continuation: input.continuation,
          expand: input.expand ?? "venue,ticket_classes",
        },
      },
    );
  },
};

export default listEvents;

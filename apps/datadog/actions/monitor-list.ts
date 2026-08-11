import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/monitor` — list monitors.
 *
 * ## It returns a bare array, and it is unbounded by default
 *
 * The response is a JSON **array** of monitors with no envelope, no `meta` and
 * no total — unlike every v2 endpoint in this app. And Datadog's own wording on
 * `page`: "If this argument is not specified, the request returns all monitors
 * without pagination." An organization with thousands of monitors returns
 * thousands of monitor objects, each carrying its full query and message.
 *
 * So `page` is **prefilled to 0** and `pageSize` to Datadog's own default of
 * 100. That turns the unbounded default into a first page; clear `page` to get
 * the vendor behaviour back deliberately.
 *
 * ## `groupStates` costs something
 *
 * It is the per-group alert detail, and asking for it on a monitor with many
 * groups multiplies the response. Off by default, matching the API.
 *
 * Needs the application key and the `monitors_read` scope.
 */
interface Input {
  name?: string;
  tags?: string;
  monitorTags?: string;
  groupStates?: string;
  withDowntimes?: boolean;
  page?: number;
  pageSize?: number;
}

const monitorList: ActionDefinition<Input> = {
  key: "monitor-list",
  type: "search",
  resource: "monitor",
  title: "List Monitors",
  description: "List monitors, optionally filtered by name and tags.",
  params: [
    { key: "name", label: "Name contains", type: "string" },
    {
      key: "tags",
      label: "Scope tags",
      type: "string",
      placeholder: "host:host0",
      hint: "Comma-separated. Filters by the tags used in the monitor's *scope*.",
    },
    {
      key: "monitorTags",
      label: "Monitor tags",
      type: "string",
      placeholder: "service:my-app",
      hint: "Comma-separated. Filters by tags applied to the monitor itself — a different set " +
        "from the scope tags above.",
    },
    {
      key: "groupStates",
      label: "Group states",
      type: "string",
      advanced: true,
      placeholder: "alert",
      hint: "Comma-separated, from `all`, `alert`, `warn`, `no data`. Adds per-group detail and " +
        "can multiply the response size.",
    },
    { key: "withDowntimes", label: "Include active downtimes", type: "boolean", advanced: true },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Prefilled: without a page Datadog returns **every** monitor in one unpaginated " +
        "array. Clear this only if you mean that.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Datadog's own default is 100, maximum 1000. Ignored unless Page is set.",
    },
  ],
  output: [
    { key: "monitors", type: "array", label: "Monitors (Datadog returns a bare array)" },
  ],

  async execute(input, ctx) {
    const monitors = await new DatadogClient(ctx).json<unknown[]>("/api/v1/monitor", {
      query: {
        name: input.name,
        tags: input.tags,
        monitor_tags: input.monitorTags,
        group_states: input.groupStates,
        with_downtimes: input.withDowntimes === true ? "true" : undefined,
        page: input.page,
        page_size: input.pageSize,
      },
    });
    // The bare array is wrapped so the action's output has a stable shape; the
    // array itself is passed through untouched.
    return { monitors: monitors ?? [] };
  },
};

export default monitorList;

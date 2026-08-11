import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/dashboard` — dashboard summaries.
 *
 * **It does not return every dashboard.** Datadog's own note: "This query will
 * only return custom created or cloned dashboards. This query will not return
 * preset dashboards." An organization running mostly on integration-provided
 * dashboards gets a short list here and it is not a bug.
 *
 * `filter[shared]` and `filter[deleted]` are documented as **incompatible with
 * each other**, so they are exposed as one three-way select rather than two
 * booleans a user can set at once.
 *
 * The response is `{dashboards: [...]}` — summaries only. Widget definitions
 * come from `dashboard-get`.
 *
 * Needs the application key and the `dashboards_read` scope.
 */
interface Input {
  filter?: string;
  count?: number;
  start?: number;
}

const dashboardList: ActionDefinition<Input> = {
  key: "dashboard-list",
  type: "search",
  resource: "dashboard",
  title: "List Dashboards",
  description: "List custom-created and cloned dashboards. Preset dashboards are not returned.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "select",
      options: [
        { value: "", label: "All custom and cloned dashboards (default)" },
        { value: "shared", label: "Only shared dashboards" },
        { value: "deleted", label: "Only deleted dashboards" },
      ],
      hint: "One or neither — Datadog documents the shared and deleted filters as incompatible.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1 },
      hint: "Datadog's own default is 100.",
    },
    {
      key: "start",
      label: "Start offset",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "dashboards", type: "array", label: "Dashboard summaries" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v1/dashboard", {
      query: {
        "filter[shared]": input.filter === "shared" ? "true" : undefined,
        "filter[deleted]": input.filter === "deleted" ? "true" : undefined,
        count: input.count,
        start: input.start,
      },
    });
  },
};

export default dashboardList;

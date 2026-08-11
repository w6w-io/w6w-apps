import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, encodeSegment } from "../lib/client.ts";

/**
 * `GET /api/v1/dashboard/{dashboard_id}` — a dashboard's full definition.
 *
 * The id is the short hyphenated string in the dashboard's URL
 * (`app.datadoghq.com/dashboard/abc-def-ghi/...`), typed `string` in Datadog's
 * schema — not a number, and not the title.
 *
 * The response is the whole dashboard including every widget definition, so it
 * is large for a busy dashboard. That is the point of the action: it is what you
 * read to diff a dashboard, or to clone one by feeding the definition to
 * something else.
 *
 * Needs the application key and the `dashboards_read` scope.
 */
interface Input {
  dashboardId: string;
}

const dashboardGet: ActionDefinition<Input> = {
  key: "dashboard-get",
  type: "read",
  resource: "dashboard",
  title: "Get Dashboard",
  description: "Fetch a dashboard's full definition, including every widget.",
  params: [
    {
      key: "dashboardId",
      label: "Dashboard ID",
      type: "string",
      required: true,
      placeholder: "abc-def-ghi",
      hint: "The id segment of the dashboard's URL, not its title.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Dashboard ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "layout_type", type: "string", label: "Layout type" },
    { key: "widgets", type: "array", label: "Widget definitions" },
    { key: "url", type: "string", label: "Path to the dashboard in Datadog" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json(`/api/v1/dashboard/${encodeSegment(input.dashboardId)}`);
  },
};

export default dashboardGet;

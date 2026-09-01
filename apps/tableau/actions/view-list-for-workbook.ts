import type { ActionDefinition } from "@w6w/types";
import { TableauClient, unwrapList } from "../lib/client.ts";

interface View {
  id: string;
  name: string;
  contentUrl?: string;
  viewUrlName?: string;
}

/**
 * `GET /sites/{siteId}/workbooks/{workbookId}/views` — verified against
 * Tableau's "Query Views for Workbook" reference page. Not paginated by
 * Tableau (a workbook's view count is bounded by its sheets), so this
 * unwraps the single response rather than walking pages.
 */
const action: ActionDefinition = {
  key: "view-list-for-workbook",
  type: "read",
  resource: "view",
  title: "List views (workbook)",
  description: "List the views inside one workbook.",
  params: [
    { key: "workbookId", label: "Workbook ID", type: "string", required: true },
    {
      key: "includeUsageStatistics",
      label: "Include Usage Statistics",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "views", type: "array", label: "Views" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workbookId = String(p.workbookId ?? "").trim();
    if (!workbookId) throw new Error("`workbookId` is required");

    const body = await new TableauClient(ctx).request<{ views?: unknown }>(
      `/workbooks/${encodeURIComponent(workbookId)}/views`,
      { query: { includeUsageStatistics: p.includeUsageStatistics === true ? "true" : undefined } },
    );
    return { views: unwrapList<View>(body.views, "view") };
  },
};

export default action;

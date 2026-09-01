import type { ActionDefinition } from "@w6w/types";
import { TableauClient, unwrapList } from "../lib/client.ts";

/**
 * `GET /sites/{siteId}/workbooks/{workbookId}` — verified against Tableau's
 * "Get Workbook" reference page. Returns the workbook's views and tags
 * alongside its own metadata.
 */
const action: ActionDefinition = {
  key: "workbook-get",
  type: "read",
  resource: "workbook",
  title: "Get a workbook",
  description: "Read a workbook's metadata, views and tags.",
  params: [
    { key: "workbookId", label: "Workbook ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Workbook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contentUrl", type: "string", label: "Content URL" },
    { key: "webpageUrl", type: "string", label: "Webpage URL" },
    { key: "views", type: "array", label: "Views" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workbookId = String(p.workbookId ?? "").trim();
    if (!workbookId) throw new Error("`workbookId` is required");

    const body = await new TableauClient(ctx).request<{ workbook: Record<string, unknown> }>(
      `/workbooks/${encodeURIComponent(workbookId)}`,
    );
    const { views, tags, ...rest } = body.workbook;
    return {
      ...rest,
      // `views`/`tags` carry the same single-item-is-not-an-array quirk as a
      // list response's own wrapper — see `unwrapList` in lib/client.ts.
      views: unwrapList<unknown>(views, "view"),
      tags: unwrapList<unknown>(tags, "tag"),
    };
  },
};

export default action;

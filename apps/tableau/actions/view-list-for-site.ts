import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";
import { FILTER_PARAM, LIST_PARAMS, SORT_PARAM } from "../lib/params.ts";

interface View {
  id: string;
  name: string;
  contentUrl?: string;
  viewUrlName?: string;
  workbook?: { id?: string };
}

/**
 * `GET /sites/{siteId}/views` — verified against Tableau's "Query Views for
 * Site" reference page. Optionally includes usage statistics, which is a
 * separate call Tableau folds into the same response rather than a second
 * request.
 */
const action: ActionDefinition = {
  key: "view-list-for-site",
  type: "read",
  resource: "view",
  title: "List views (site)",
  description: "List every view on this site, optionally with usage statistics.",
  params: [
    {
      key: "includeUsageStatistics",
      label: "Include Usage Statistics",
      type: "boolean",
      default: false,
    },
    FILTER_PARAM,
    SORT_PARAM,
    ...LIST_PARAMS,
  ],
  output: [{ key: "views", type: "array", label: "Views" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);
    const client = new TableauClient(ctx);

    ctx.log("info", "listing Tableau views for site", { returnAll, limit });

    const views = await client.requestList<View>(
      "/views",
      "views",
      "view",
      {
        query: {
          includeUsageStatistics: p.includeUsageStatistics === true ? "true" : undefined,
          filter: (p.filter as string) || undefined,
          sort: (p.sort as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
    return { views };
  },
};

export default action;

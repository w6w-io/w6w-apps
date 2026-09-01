import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";
import { FILTER_PARAM, LIST_PARAMS, SORT_PARAM } from "../lib/params.ts";

interface Datasource {
  id: string;
  name: string;
  type?: string;
  contentUrl?: string;
  isCertified?: boolean;
  hasExtracts?: boolean;
  project?: { id?: string; name?: string };
}

/**
 * `GET /sites/{siteId}/datasources` — verified against Tableau's "Query Data
 * Sources" reference page. Lists PUBLISHED data sources only; a data source
 * embedded inside a workbook is a separate surface ("Query Workbook
 * Connections", out of scope here) the vendor's own docs point to instead.
 */
const action: ActionDefinition = {
  key: "datasource-list",
  type: "read",
  resource: "datasource",
  title: "List data sources",
  description: "List the published data sources on this site.",
  params: [FILTER_PARAM, SORT_PARAM, ...LIST_PARAMS],
  output: [{ key: "datasources", type: "array", label: "Data sources" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);
    const client = new TableauClient(ctx);

    ctx.log("info", "listing Tableau data sources", { returnAll, limit });

    const datasources = await client.requestList<Datasource>(
      "/datasources",
      "datasources",
      "datasource",
      {
        query: { filter: (p.filter as string) || undefined, sort: (p.sort as string) || undefined },
      },
      returnAll ? Infinity : limit,
    );
    return { datasources };
  },
};

export default action;

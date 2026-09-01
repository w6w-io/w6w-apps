import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";
import { FILTER_PARAM, LIST_PARAMS, SORT_PARAM } from "../lib/params.ts";

interface Workbook {
  id: string;
  name: string;
  contentUrl?: string;
  webpageUrl?: string;
  showTabs?: boolean;
  size?: string;
  createdAt?: string;
  updatedAt?: string;
  project?: { id?: string; name?: string };
  owner?: { id?: string };
}

/**
 * `GET /sites/{siteId}/workbooks` — verified against Tableau's "Query
 * Workbooks for Site" reference page.
 *
 * "If the user is not an administrator, the method returns just the
 * workbooks that the user has permissions to view" — a non-admin PAT is not
 * refused here, it just sees a narrower list.
 */
const action: ActionDefinition = {
  key: "workbook-list",
  type: "read",
  resource: "workbook",
  title: "List workbooks",
  description: "List the workbooks on this site.",
  params: [FILTER_PARAM, SORT_PARAM, ...LIST_PARAMS],
  output: [{ key: "workbooks", type: "array", label: "Workbooks" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);
    const client = new TableauClient(ctx);

    ctx.log("info", "listing Tableau workbooks", { returnAll, limit });

    const workbooks = await client.requestList<Workbook>(
      "/workbooks",
      "workbooks",
      "workbook",
      {
        query: { filter: (p.filter as string) || undefined, sort: (p.sort as string) || undefined },
      },
      returnAll ? Infinity : limit,
    );
    return { workbooks };
  },
};

export default action;

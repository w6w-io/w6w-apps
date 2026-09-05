import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";

interface Input {
  startIndex?: number;
  count?: number;
  sortOption?: string;
}

interface Output {
  workbooks: unknown[];
  resourceCount?: unknown;
}

/**
 * `workbook.list` at `POST /api/v2/workbooks` — the one workbook operation
 * with no `resource_id` in its path, since it's how one is discovered.
 */
const workbookList: ActionDefinition<Input, Output> = {
  key: "workbook-list",
  type: "read",
  resource: "workbook",
  title: "List Workbooks",
  description: "List workbooks (owned or shared) the connected account can see.",
  params: [
    {
      key: "startIndex",
      label: "Start Index",
      type: "number",
      hint: "Optional. 1-based offset for paging through a large list.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Optional. Number of workbooks to return. Zoho returns up to 1000 when omitted.",
    },
    {
      key: "sortOption",
      label: "Sort",
      type: "select",
      options: [
        { value: "recently_created", label: "Recently created" },
        { value: "recently_opened", label: "Recently opened" },
        { value: "recently_modified", label: "Recently modified" },
        { value: "ascending", label: "Name, ascending" },
        { value: "descending", label: "Name, descending" },
      ],
      default: "recently_created",
    },
  ],
  output: [
    { key: "workbooks", type: "array", label: "Workbooks" },
    { key: "resourceCount", type: "number", label: "Total workbook count" },
  ],

  async execute(input, ctx) {
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(
      "workbooks",
      "workbook.list",
      compact({
        start_index: input.startIndex,
        count: input.count,
        sort_option: input.sortOption,
      }),
    );
    return {
      workbooks: (body.workbooks as unknown[] | undefined) ?? [],
      resourceCount: body.resource_count,
    };
  },
};

export default workbookList;

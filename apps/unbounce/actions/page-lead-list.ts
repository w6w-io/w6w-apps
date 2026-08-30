import type { ActionDefinition, Param } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { pageIdParam } from "../lib/params.ts";

/**
 * `GET /pages/{page_id}/leads` — every lead (form submission) a page's forms,
 * pop-ups or sticky bars have collected. Unlike every other collection
 * endpoint in this app, the reference documents **no `count` parameter** here
 * — only `sort_order`, `from`, `to`, `offset` and `limit`.
 */
interface Input {
  pageId: string;
  sortOrder?: string;
  from?: string;
  to?: string;
  offset?: number;
  limit?: number;
}

const params: Param[] = [
  pageIdParam,
  {
    key: "sortOrder",
    label: "Sort order",
    type: "select",
    default: "asc",
    options: [
      { value: "asc", label: "Ascending (default)" },
      { value: "desc", label: "Descending" },
    ],
    hint: "Sort by creation date.",
  },
  {
    key: "from",
    label: "Created after",
    type: "datetime",
    hint: "Limit results to those created after this date-time.",
  },
  {
    key: "to",
    label: "Created before",
    type: "datetime",
    hint: "Limit results to those created before this date-time.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    validation: { integer: true, min: 0 },
    hint: "Number of results to skip from the start.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    validation: { integer: true, min: 1, max: 1000 },
    hint: "Unbounce's own default is 50; the documented maximum is 1000.",
  },
];

const pageLeadList: ActionDefinition<Input> = {
  key: "page-lead-list",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description:
    "Retrieve all leads (form submissions) for a given page, pop-up, sticky bar, or AMP page.",
  params,
  output: [
    { key: "leads", type: "array", label: "Leads" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/pages/${encodeId(input.pageId)}/leads`, {
      sort_order: input.sortOrder,
      from: input.from,
      to: input.to,
      offset: input.offset,
      limit: input.limit,
    });
  },
};

export default pageLeadList;

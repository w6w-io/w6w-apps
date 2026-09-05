import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient } from "../lib/client.ts";
import { APP_ID_PARAM, RECORD_ID_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  recordId: string;
  order?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

interface GetCommentsResponse {
  comments: Record<string, unknown>[];
  older: boolean;
  newer: boolean;
}

/**
 * `GET /k/v1/record/comments.json` — verified against
 * `docs/kintone/rest-api/records/get-comments` 2026-09-05.
 *
 * `limit` caps at 10 and defaults to 10 — this is Kintone's own ceiling, not
 * this app's; page further back with `offset`.
 */
const action: ActionDefinition<Input, GetCommentsResponse> = {
  key: "comments-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "Retrieve a record's comments, newest first by default.",
  params: [
    APP_ID_PARAM,
    RECORD_ID_PARAM,
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "desc",
      options: [{ value: "asc", label: "Oldest first" }, { value: "desc", label: "Newest first" }],
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 10 },
      hint: "Kintone returns at most 10 comments per call regardless of this value.",
    },
  ],
  output: [
    { key: "comments", label: "Comments", type: "array" },
    { key: "older", label: "More Older Comments Exist", type: "boolean" },
    { key: "newer", label: "More Newer Comments Exist", type: "boolean" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "listing Kintone comments", { appId: input.appId, recordId: input.recordId });
    return await new KintoneClient(ctx).request<GetCommentsResponse>("/record/comments", {
      query: compact({
        app: input.appId,
        record: input.recordId,
        order: input.order,
        offset: input.offset,
        limit: input.limit,
      }),
    });
  },
};

export default action;

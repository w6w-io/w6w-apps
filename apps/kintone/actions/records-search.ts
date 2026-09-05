import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient, parseJson } from "../lib/client.ts";
import { APP_ID_PARAM, FIELDS_PARAM, QUERY_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  query?: string;
  fields?: unknown;
  totalCount?: boolean;
}

interface GetRecordsResponse {
  records: Record<string, unknown>[];
  totalCount: string | null;
}

/**
 * `GET /k/v1/records.json` — verified against
 * `docs/kintone/rest-api/records/get-records` 2026-09-05.
 *
 * Kintone's own query string carries paging (`limit`/`offset`, default 100,
 * max 500 per call — put them in `query`, e.g. `... limit 100 offset 100`)
 * rather than separate params, so `query` is the one place to control both
 * filtering and pagination. `totalCount: true` costs an extra count query on
 * Kintone's side — leave it off when a workflow only needs the rows.
 */
const action: ActionDefinition<Input, GetRecordsResponse> = {
  key: "records-search",
  type: "search",
  resource: "record",
  title: "Search Records",
  description: "Retrieve records from a Kintone App matching a query string.",
  params: [
    APP_ID_PARAM,
    QUERY_PARAM,
    FIELDS_PARAM,
    {
      key: "totalCount",
      label: "Include Total Count",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Adds the total number of matching records (ignoring limit/offset) to the response.",
    },
  ],
  output: [
    { key: "records", label: "Records", type: "array" },
    { key: "totalCount", label: "Total Count", type: "string" },
  ],

  async execute(input, ctx) {
    const fields = parseJson(input.fields, "fields");
    if (fields !== undefined && !Array.isArray(fields)) {
      throw new Error("`fields` must be a JSON array of field codes");
    }
    ctx.log("info", "searching Kintone records", { appId: input.appId, hasQuery: !!input.query });
    return await new KintoneClient(ctx).request<GetRecordsResponse>("/records", {
      query: compact({
        app: input.appId,
        query: input.query,
        fields,
        totalCount: input.totalCount === true ? "true" : undefined,
      }),
    });
  },
};

export default action;

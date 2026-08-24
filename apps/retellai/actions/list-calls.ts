import type { ActionDefinition } from "@w6w/types";
import { compact, RetellClient } from "../lib/client.ts";
import { callStatusOptions, paginationParams, sortOrderParam } from "../lib/params.ts";

/**
 * `POST /v3/list-calls` — search calls with cursor pagination.
 *
 * Unlike `v2/list-agents` and `v2/list-phone-numbers`, EVERY parameter here
 * — including pagination — lives in the POST body, not the query string. See
 * `lib/client.ts` for the three different pagination conventions this API
 * mixes across its list endpoints.
 *
 * Retell's `filter_criteria` is a typed-filter grammar, not a plain object:
 * each field takes `{type, op, value}` (e.g. `{"type":"string","op":"eq",
 * "value":"+14155551234"}`), and the schema forbids combining `skip` with
 * `pagination_key` on the same request — one or the other, never both. This
 * action exposes the common case (agent, status, from/to number, exact
 * match) directly and builds the typed filter internally, and only ever
 * sends `paginationKey` for paging, never `skip`, since the cursor is what
 * the vendor recommends and `total`/`include_total` costs an extra aggregate
 * query the vendor's own schema warns is not free.
 */
interface Input {
  agentId?: string;
  callStatus?: string;
  fromNumber?: string;
  toNumber?: string;
  sortOrder?: "ascending" | "descending";
  limit?: number;
  paginationKey?: string;
  includeTotal?: boolean;
}

interface Output {
  items: unknown[];
  has_more?: boolean;
  pagination_key?: string;
  total?: number;
}

const listCalls: ActionDefinition<Input, Output> = {
  key: "list-calls",
  type: "search",
  resource: "call",
  title: "List Calls",
  description: "Search calls by agent, status or number, newest first by default.",
  params: [
    { key: "agentId", label: "Agent ID", type: "string" },
    { key: "callStatus", label: "Call status", type: "select", options: callStatusOptions },
    { key: "fromNumber", label: "From number", type: "string" },
    { key: "toNumber", label: "To number", type: "string" },
    sortOrderParam,
    ...paginationParams(50, "Vendor default is 50, maximum is 1000."),
    {
      key: "includeTotal",
      label: "Include total count",
      type: "boolean",
      hint: "Costs an extra aggregate query per the vendor's own documentation — leave off " +
        "unless the total is actually needed.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Calls" },
    { key: "has_more", type: "boolean", label: "More results available" },
    { key: "pagination_key", type: "string", label: "Cursor for the next page" },
    { key: "total", type: "number", label: "Total matching calls (only when requested)" },
  ],

  execute(input, ctx) {
    const filters: Record<string, unknown> = {};
    if (input.agentId) filters.agent = [{ agent_id: input.agentId }];
    if (input.callStatus) {
      filters.call_status = { type: "enum", op: "in", value: [input.callStatus] };
    }
    if (input.fromNumber) {
      filters.from_number = { type: "string", op: "eq", value: input.fromNumber };
    }
    if (input.toNumber) filters.to_number = { type: "string", op: "eq", value: input.toNumber };

    return new RetellClient(ctx).request<Output>("/v3/list-calls", {
      method: "POST",
      body: compact({
        filter_criteria: Object.keys(filters).length ? filters : undefined,
        sort_order: input.sortOrder,
        limit: input.limit,
        pagination_key: input.paginationKey,
        include_total: input.includeTotal,
      }),
    });
  },
};

export default listCalls;

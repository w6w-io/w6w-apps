import type { ActionDefinition } from "@w6w/types";
import { BlandClient, compact, type QueryValue } from "../lib/client.ts";

/**
 * `GET /v1/calls` — metadata for calls dispatched by this account.
 *
 * Verified against `docs.bland.ai/api-v1/get/calls`. Individual transcripts
 * are NOT included in the list response (the vendor's own note); use
 * `call-get` for a single call's transcript.
 */
interface Input {
  fromNumber?: string;
  toNumber?: string;
  limit?: number;
  ascending?: boolean;
  startDate?: string;
  endDate?: string;
  completed?: boolean;
  batchId?: string;
  answeredBy?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List Calls",
  description: "Returns metadata for calls dispatched by this account.",
  params: [
    { key: "fromNumber", label: "From Number", type: "string" },
    { key: "toNumber", label: "To Number", type: "string" },
    { key: "limit", label: "Limit", type: "number", default: 20, hint: "Vendor default is 1,000." },
    { key: "ascending", label: "Ascending", type: "boolean", default: false },
    { key: "startDate", label: "Start Date", type: "string", hint: "YYYY-MM-DD or full ISO 8601." },
    { key: "endDate", label: "End Date", type: "string" },
    { key: "completed", label: "Completed Only", type: "boolean" },
    { key: "batchId", label: "Batch ID", type: "string" },
    { key: "answeredBy", label: "Answered By", type: "string", hint: "e.g. human, voicemail." },
  ],
  output: [
    { key: "totalCount", type: "number", label: "Total matching calls" },
    { key: "count", type: "number", label: "Calls returned" },
    { key: "calls", type: "array", label: "Call summaries" },
  ],

  async execute(input, ctx) {
    const query = compact({
      from_number: input.fromNumber,
      to_number: input.toNumber,
      limit: input.limit,
      ascending: input.ascending,
      start_date: input.startDate,
      end_date: input.endDate,
      completed: input.completed,
      batch_id: input.batchId,
      answered_by: input.answeredBy,
    }) as Record<string, QueryValue>;

    const res = await new BlandClient(ctx).request<{
      total_count?: number;
      count?: number;
      calls?: unknown[];
    }>("/v1/calls", { query });

    return {
      totalCount: res.total_count ?? res.count ?? (res.calls ?? []).length,
      count: res.count ?? (res.calls ?? []).length,
      calls: res.calls ?? [],
    };
  },
};

export default callList;

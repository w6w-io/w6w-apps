import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, type ClickSendPage, compact } from "../lib/client.ts";

interface Input {
  dateFrom?: number;
  dateTo?: number;
  q?: string;
  orderBy?: string;
  page?: number;
  limit?: number;
}

export interface SmsHistoryRow {
  direction?: string;
  date?: string;
  to?: string;
  body?: string;
  status?: string;
  from?: string;
  schedule?: string;
  status_code?: number | null;
  status_text?: string | null;
  error_code?: string | null;
  error_text?: string | null;
  message_id?: string;
  message_parts?: string;
  message_price?: string;
  custom_string?: string;
  contact_id?: number;
  country?: string;
  carrier?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * `GET /sms/history` — paginated outbound + inbound SMS log.
 *
 * ClickSend wraps every list endpoint's rows one level deeper than the outer
 * pagination envelope: the response is `{data: {total, per_page, ..., data: [...]}}`
 * — the actual rows are `data.data`, not `data`. This Action unwraps both levels
 * so the output's `rows` is the flat array.
 *
 * `status` (`Completed`/`Sent`/`Cancelled`/`Scheduled`/`WaitApproval`) is
 * ClickSend's queue-state field; `status_code`/`status_text` (only populated once
 * a delivery receipt has come back) are the carrier-level outcome — `200`/`201`
 * are success, `300`/`301`/`302` are failure. A row can be `status: "Completed"`
 * with a `null` `status_code` simply because no receipt has arrived yet, which is
 * not the same as failure.
 */
const smsHistoryList: ActionDefinition<Input> = {
  key: "sms-history-list",
  type: "read",
  resource: "sms",
  title: "List SMS History",
  description: "List sent/received SMS history (GET /sms/history), newest activity first.",
  params: [
    {
      key: "dateFrom",
      label: "From (Unix timestamp)",
      type: "number",
      hint: "Only include messages on or after this time.",
    },
    {
      key: "dateTo",
      label: "To (Unix timestamp)",
      type: "number",
      hint: "Only include messages on or before this time.",
    },
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: 'ClickSend query syntax, e.g. "status:Completed,direction:out".',
    },
    { key: "orderBy", label: "Order by", type: "string", hint: 'e.g. "date:desc".' },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "limit", label: "Limit", type: "number", default: 15, hint: "Min 15, max 100." },
  ],
  output: [
    { key: "rows", type: "array", label: "History rows" },
    { key: "total", type: "number", label: "Total matching rows" },
    { key: "currentPage", type: "number", label: "Current page" },
    { key: "lastPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const page = await client.data<ClickSendPage<SmsHistoryRow>>("/sms/history", {
      query: compact({
        date_from: input.dateFrom,
        date_to: input.dateTo,
        q: input.q,
        order_by: input.orderBy,
        page: input.page,
        limit: input.limit,
      }),
    });
    return {
      rows: page.data ?? [],
      total: page.total,
      currentPage: page.current_page,
      lastPage: page.last_page,
    };
  },
};

export default smsHistoryList;

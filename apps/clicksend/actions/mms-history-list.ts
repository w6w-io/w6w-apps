import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, type ClickSendPage, compact } from "../lib/client.ts";

interface Input {
  q?: string;
  orderBy?: string;
  dateFrom?: number;
  dateTo?: number;
  page?: number;
  limit?: number;
}

export interface MmsHistoryRow {
  user_id?: number;
  subaccount_id?: number;
  list_id?: number;
  contact_id?: number;
  message_id?: string;
  direction?: string;
  to?: string;
  subject?: string;
  from?: string;
  body?: string;
  carrier?: string;
  country?: string;
  custom_string?: string;
  schedule?: string;
  from_email?: string | null;
  message_parts?: string;
  message_price?: string;
  priority?: number;
  status?: string;
  status_code?: string;
  status_text?: string;
  date_added?: number;
  _media_file_url?: string;
}

/**
 * `GET /mms/history` — paginated MMS log.
 *
 * Same double-nesting as SMS history (`data.data` holds the rows), and the same
 * caveat: `status_code`/`status_text` are only populated once a delivery receipt
 * has arrived, so a `null` there does not mean failure.
 */
const mmsHistoryList: ActionDefinition<Input> = {
  key: "mms-history-list",
  type: "read",
  resource: "mms",
  title: "List MMS History",
  description: "List sent/received MMS history (GET /mms/history), newest activity first.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: 'ClickSend query syntax, e.g. "list_id:429,direction:out".',
    },
    { key: "orderBy", label: "Order by", type: "string", hint: 'e.g. "subject:desc".' },
    { key: "dateFrom", label: "From (Unix timestamp)", type: "number" },
    { key: "dateTo", label: "To (Unix timestamp)", type: "number" },
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
    const page = await client.data<ClickSendPage<MmsHistoryRow>>("/mms/history", {
      query: compact({
        q: input.q,
        order_by: input.orderBy,
        date_from: input.dateFrom,
        date_to: input.dateTo,
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

export default mmsHistoryList;

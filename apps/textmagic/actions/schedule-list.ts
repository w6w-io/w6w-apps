import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";
import { orderingParams, paginationParams } from "../lib/params.ts";

/** `GET /api/v2/schedules` — this account's scheduled (future/recurring) messages. */
interface Input {
  page?: number;
  limit?: number;
  status?: "a" | "c" | "x";
  orderBy?: string;
  direction?: "asc" | "desc";
}

const scheduleList: ActionDefinition<Input> = {
  key: "schedule-list",
  type: "read",
  resource: "schedule",
  title: "List Scheduled Messages",
  description: "List messages scheduled for future or recurring delivery.",
  params: [
    ...paginationParams,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Actual (not yet sent)", value: "a" },
        { label: "Completed", value: "c" },
        { label: "All", value: "x" },
      ],
    },
    ...orderingParams,
  ],
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Scheduled messages" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json<TmPage<unknown>>("/schedules", {
      query: compact({ ...input }),
    });
  },
};

export default scheduleList;

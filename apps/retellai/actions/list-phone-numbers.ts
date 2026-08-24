import type { ActionDefinition } from "@w6w/types";
import { compact, RetellClient } from "../lib/client.ts";
import { paginationParams, sortOrderParam } from "../lib/params.ts";

/**
 * `GET /v2/list-phone-numbers` — list numbers this account owns or imported.
 *
 * A plain GET with query-string pagination, unlike `list-agents` (a POST with
 * the same query-string pagination convention plus a JSON body for filters)
 * and `v3/list-calls` (everything in the body). No filter parameters exist
 * on this endpoint at all — the vendor's own document declares none.
 */
interface Input {
  sortOrder?: "ascending" | "descending";
  limit?: number;
  paginationKey?: string;
}

interface PhoneNumberItem {
  phone_number: string;
  phone_number_type: string;
  phone_number_pretty?: string;
  [key: string]: unknown;
}

interface Output {
  items: PhoneNumberItem[];
  has_more?: boolean;
  pagination_key?: string;
}

const listPhoneNumbers: ActionDefinition<Input, Output> = {
  key: "list-phone-numbers",
  type: "search",
  resource: "phone-number",
  title: "List Phone Numbers",
  description: "List phone numbers owned by or imported into this account.",
  params: [
    sortOrderParam,
    ...paginationParams(50, "Vendor default is 50, maximum is 1000."),
  ],
  output: [
    { key: "items", type: "array", label: "Phone numbers" },
    { key: "has_more", type: "boolean", label: "More results available" },
    { key: "pagination_key", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new RetellClient(ctx).request<Output>("/v2/list-phone-numbers", {
      query: compact({
        limit: input.limit,
        sort_order: input.sortOrder,
        pagination_key: input.paginationKey,
      }),
    });
  },
};

export default listPhoneNumbers;

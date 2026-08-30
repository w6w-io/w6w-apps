import type { ActionDefinition } from "@w6w/types";
import { compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  numbersPerPage?: number;
  pageNumber?: number;
  accountId?: number;
  profileId?: number;
}

/**
 * `GET /tracking/numbers` — a paginated list of tracking phone numbers.
 *
 * Verified against `whatconverts.com/api/tracking/` on 2026-08-29. `account_id`/
 * `profile_id` filters are honoured only with a Master Account (agency) Key, same as
 * `leads-list`.
 */
const trackingNumbersList: ActionDefinition<Input> = {
  key: "tracking-numbers-list",
  type: "read",
  resource: "tracking-number",
  title: "List Tracking Numbers",
  description: "Get a paginated list of tracking phone numbers.",
  params: [
    {
      key: "numbersPerPage",
      label: "Numbers per page",
      type: "number",
      default: 25,
      hint: "Vendor default 25, maximum 250.",
    },
    { key: "pageNumber", label: "Page number", type: "number" },
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      advanced: true,
      hint: "Master Account Key only.",
    },
    {
      key: "profileId",
      label: "Profile ID",
      type: "number",
      advanced: true,
      hint: "Master Account Key only.",
    },
  ],
  output: [
    { key: "page_number", type: "number", label: "Current page number" },
    { key: "numbers_per_page", type: "number", label: "Numbers returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_numbers", type: "number", label: "Total numbers available" },
    { key: "numbers", type: "array", label: "Tracking numbers" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      "/tracking/numbers",
      compact({
        numbers_per_page: input.numbersPerPage ?? 25,
        page_number: input.pageNumber,
        account_id: input.accountId,
        profile_id: input.profileId,
      }),
    );
  },
};

export default trackingNumbersList;

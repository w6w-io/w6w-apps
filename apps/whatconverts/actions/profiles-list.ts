import type { ActionDefinition } from "@w6w/types";
import { compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  accountId: number;
  profilesPerPage?: number;
  pageNumber?: number;
  startDate?: string;
  endDate?: string;
  order?: "asc" | "desc";
}

/**
 * `GET /accounts/{account_id}/profiles` — a paginated list of the profiles (tracking
 * properties) under one account. Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/profiles/` on 2026-08-29.
 */
const profilesList: ActionDefinition<Input> = {
  key: "profiles-list",
  type: "read",
  resource: "profile",
  title: "List Profiles",
  description: "Get a paginated list of profiles under an account. Requires a Master " +
    "Account (agency) Key.",
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    {
      key: "profilesPerPage",
      label: "Profiles per page",
      type: "number",
      default: 25,
      hint: "Vendor default 25, maximum 250.",
    },
    { key: "pageNumber", label: "Page number", type: "number" },
    { key: "startDate", label: "Start date", type: "string", advanced: true },
    { key: "endDate", label: "End date", type: "string", advanced: true },
    {
      key: "order",
      label: "Order by date created",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      default: "desc",
      advanced: true,
    },
  ],
  output: [
    { key: "page_number", type: "number", label: "Current page number" },
    { key: "profiles_per_page", type: "number", label: "Profiles returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_profiles", type: "number", label: "Total profiles available" },
    { key: "profiles", type: "array", label: "Profiles" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      `/accounts/${input.accountId}/profiles`,
      compact({
        profiles_per_page: input.profilesPerPage ?? 25,
        page_number: input.pageNumber,
        start_date: input.startDate,
        end_date: input.endDate,
        order: input.order,
      }),
    );
  },
};

export default profilesList;

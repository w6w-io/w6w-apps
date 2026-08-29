import type { ActionDefinition } from "@w6w/types";
import { compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  formsPerPage?: number;
  pageNumber?: number;
  accountId?: number;
  profileId?: number;
}

/**
 * `GET /tracking/forms` — a paginated list of tracked web forms.
 *
 * Verified against `whatconverts.com/api/tracking/` on 2026-08-29. `account_id`/
 * `profile_id` filters are honoured only with a Master Account (agency) Key, same as
 * `leads-list`.
 */
const trackingFormsList: ActionDefinition<Input> = {
  key: "tracking-forms-list",
  type: "read",
  resource: "tracking-form",
  title: "List Tracking Forms",
  description: "Get a paginated list of tracked web forms.",
  params: [
    {
      key: "formsPerPage",
      label: "Forms per page",
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
    { key: "forms_per_page", type: "number", label: "Forms returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_forms", type: "number", label: "Total forms available" },
    { key: "forms", type: "array", label: "Tracked web forms" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      "/tracking/forms",
      compact({
        forms_per_page: input.formsPerPage ?? 25,
        page_number: input.pageNumber,
        account_id: input.accountId,
        profile_id: input.profileId,
      }),
    );
  },
};

export default trackingFormsList;

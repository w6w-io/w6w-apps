import type { ActionDefinition } from "@w6w/types";
import { DonorboxClient } from "../lib/client.ts";
import {
  compact,
  dateRangeParams,
  dateRangeQuery,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

interface Input {
  email?: string;
  campaign_id?: number;
  campaign_name?: string;
  donor_id?: number;
  first_name?: string;
  last_name?: string;
  donor_name?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  order?: string;
}

/** `GET /api/v1/plans` — recurring donation plans. */
const planList: ActionDefinition<Input> = {
  key: "plan-list",
  type: "search",
  resource: "plan",
  title: "List Plans",
  description: "List recurring donation plans on the connected Donorbox organization.",
  params: [
    { key: "email", label: "Donor email", type: "string" },
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "campaign_name", label: "Campaign name", type: "string" },
    {
      key: "donor_id",
      label: "Donor ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "The Donorbox-generated donor id.",
    },
    { key: "first_name", label: "Donor first name", type: "string" },
    { key: "last_name", label: "Donor last name", type: "string" },
    {
      key: "donor_name",
      label: "Donor full name",
      type: "string",
      hint: 'Equivalent to setting first + last name together, e.g. "Jane Doe".',
    },
    ...dateRangeParams(
      "Filters by the plan's started date. Accepted formats: YYYY-mm-dd, YYYY/mm/dd, YYYYmmdd, " +
        "dd-mm-YYYY.",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Plans" },
  ],

  async execute(input, ctx) {
    const data = await new DonorboxClient(ctx).list("/plans", {
      query: compact({
        email: input.email,
        campaign_id: input.campaign_id,
        campaign_name: input.campaign_name,
        donor_id: input.donor_id,
        first_name: input.first_name,
        last_name: input.last_name,
        donor_name: input.donor_name,
        ...dateRangeQuery(input),
        ...paginationQuery(input),
      }),
    });
    return { data };
  },
};

export default planList;

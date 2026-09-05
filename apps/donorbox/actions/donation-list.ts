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
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  donor_id?: number;
  campaign_id?: number;
  campaign_name?: string;
  date_from?: string;
  date_to?: string;
  amountCurrency?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  per_page?: number;
  order?: string;
}

/**
 * `GET /api/v1/donations`.
 *
 * The amount filter is currency-scoped in the query key itself —
 * `amount[usd][min]`/`amount[usd][max]` — rather than a flat parameter name
 * (README "Donation Filters": `{GET} /api/v1/donations?amount[usd][min]=XXX&amount[usd][max]=YYYY`).
 * `amountCurrency` picks which bracket to build; `amountMin`/`amountMax` may
 * be used together or alone, per the README.
 */
const donationList: ActionDefinition<Input> = {
  key: "donation-list",
  type: "search",
  resource: "donation",
  title: "List Donations",
  description: "List the connected Donorbox organization's donations.",
  params: [
    {
      key: "id",
      label: "Donation ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Narrow to one donation by its Donorbox id.",
    },
    { key: "email", label: "Donor email", type: "string" },
    { key: "first_name", label: "Donor first name", type: "string" },
    { key: "last_name", label: "Donor last name", type: "string" },
    {
      key: "donor_id",
      label: "Donor ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "The Donorbox-generated donor id.",
    },
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "campaign_name", label: "Campaign name", type: "string" },
    ...dateRangeParams(
      "Filters by donation date. Accepted formats: YYYY-mm-dd, YYYY/mm/dd, YYYYmmdd, dd-mm-YYYY.",
    ),
    {
      key: "amountCurrency",
      label: "Amount currency",
      type: "string",
      default: "usd",
      hint: "Lowercase 3-letter currency code, matching the campaign's own `currency` field — " +
        "e.g. usd.",
      advanced: true,
    },
    {
      key: "amountMin",
      label: "Amount min",
      type: "number",
      hint: "Minimum donation amount in the currency above. Usable alone or together with max.",
      advanced: true,
    },
    {
      key: "amountMax",
      label: "Amount max",
      type: "number",
      hint: "Maximum donation amount in the currency above. Usable alone or together with min.",
      advanced: true,
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Donations" },
  ],

  async execute(input, ctx) {
    const currency = input.amountCurrency || "usd";
    const base: Record<string, string | number | undefined> = compact({
      id: input.id,
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      donor_id: input.donor_id,
      campaign_id: input.campaign_id,
      campaign_name: input.campaign_name,
      ...dateRangeQuery(input),
      ...paginationQuery(input),
    });
    if (input.amountMin !== undefined) base[`amount[${currency}][min]`] = input.amountMin;
    if (input.amountMax !== undefined) base[`amount[${currency}][max]`] = input.amountMax;

    const data = await new DonorboxClient(ctx).list("/donations", { query: base });
    return { data };
  },
};

export default donationList;

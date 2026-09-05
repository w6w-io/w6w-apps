import type { ActionDefinition } from "@w6w/types";
import { boolStr, compact, TapfiliateClient } from "../lib/client.ts";
import { dateRangeParams, pageParam } from "../lib/params.ts";

/**
 * `GET /conversions/{?program_id,external_id,affiliate_id,pending,date_from,date_to,use_profile_timezone}`
 */
interface Input {
  programId?: string;
  externalId?: string;
  affiliateId?: string;
  pending?: boolean;
  dateFrom?: string;
  dateTo?: string;
  useProfileTimezone?: boolean;
  page?: number;
}

const conversionList: ActionDefinition<Input> = {
  key: "conversion-list",
  type: "search",
  resource: "conversion",
  title: "List Conversions",
  description:
    "List conversions, optionally filtered by program, external id, affiliate, or date range.",
  params: [
    { key: "programId", label: "Program", type: "string" },
    {
      key: "externalId",
      label: "External id",
      type: "string",
      hint:
        "The unique id from your own system or shopping cart, passed when the conversion was tracked.",
    },
    { key: "affiliateId", label: "Affiliate", type: "string" },
    {
      key: "pending",
      label: "Pending commissions only",
      type: "boolean",
      hint: "Only show conversions that have pending (unapproved) commissions.",
    },
    ...dateRangeParams(),
    {
      key: "useProfileTimezone",
      label: "Use profile timezone",
      type: "boolean",
      hint: "Interpret the date range in your account's timezone instead of UTC.",
    },
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Conversions" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/conversions/", {
      query: compact({
        program_id: input.programId,
        external_id: input.externalId,
        affiliate_id: input.affiliateId,
        pending: boolStr(input.pending),
        date_from: input.dateFrom,
        date_to: input.dateTo,
        use_profile_timezone: boolStr(input.useProfileTimezone),
        page: input.page,
      }),
    });
  },
};

export default conversionList;

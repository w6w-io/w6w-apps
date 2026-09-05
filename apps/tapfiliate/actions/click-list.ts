import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { dateRangeParams, pageParam } from "../lib/params.ts";

/**
 * `GET /clicks/{?program_id,affiliate_id,date_from,date_to}`
 *
 * The docs state plainly: "The method is available only for the clients of
 * Enterprise plan." On any other plan this will fail — most likely with a
 * 403 or 404, neither of which could be verified live without an Enterprise
 * account.
 *
 * The docs also show a `meta_data[key]`/`meta_data[value]` filter pair for
 * matching on a specific meta-data entry — its bracketed-key query syntax is
 * shown only in one example URL, with no further schema, so it is left out
 * of this action's params rather than guessed at.
 */
interface Input {
  programId?: string;
  affiliateId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

const clickList: ActionDefinition<Input> = {
  key: "click-list",
  type: "search",
  resource: "click",
  title: "List Clicks",
  description:
    "List clicks, optionally filtered by program, affiliate, or date range. Enterprise plan only.",
  params: [
    { key: "programId", label: "Program", type: "string" },
    { key: "affiliateId", label: "Affiliate", type: "string" },
    ...dateRangeParams(),
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Clicks" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/clicks/", {
      query: compact({
        program_id: input.programId,
        affiliate_id: input.affiliateId,
        date_from: input.dateFrom,
        date_to: input.dateTo,
        page: input.page,
      }),
    });
  },
};

export default clickList;

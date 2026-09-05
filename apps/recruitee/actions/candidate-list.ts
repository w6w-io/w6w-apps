import type { ActionDefinition } from "@w6w/types";
import { flag, RecruiteeClient, toNumberList } from "../lib/client.ts";
import { candidateSortOptions } from "../lib/params.ts";

/**
 * `GET /c/{company_id}/candidates` — verified against the `List all
 * candidates` resource in `apidocs.recruitee.com` (fetched 2026-09-05) and
 * live against `api.recruitee.com` (see `lib/client.ts` for why the doc alone
 * is not trusted).
 *
 * `limit`'s documented default is 100 (max 1000) — unlike some vendors in this
 * pack, that default is left as-is rather than lowered, since 100 is already a
 * sane page size.
 */
interface Input {
  query?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  offerId?: number;
  disqualified?: boolean;
  deleted?: boolean;
  qualified?: boolean;
  createdAfter?: string;
  ids?: number[] | string;
}

const candidateList: ActionDefinition<Input> = {
  key: "candidate-list",
  type: "search",
  resource: "candidate",
  title: "List Candidates",
  description: "Search/list candidates, optionally filtered by offer, qualification or deletion.",
  params: [
    {
      key: "query",
      label: "Search query",
      type: "string",
      hint: "Matches candidate name or offer.",
    },
    { key: "sort", label: "Sort by", type: "select", options: candidateSortOptions },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Recruitee's own default is 100; the documented maximum is 1000.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Skip this many candidates from the start — offset for the next page should be the " +
        "current offset plus limit.",
    },
    { key: "offerId", label: "Filter by offer ID", type: "number", validation: { integer: true } },
    { key: "disqualified", label: "Only disqualified", type: "boolean" },
    { key: "deleted", label: "Only deleted", type: "boolean" },
    { key: "qualified", label: "Only qualified", type: "boolean" },
    {
      key: "createdAfter",
      label: "Created after",
      type: "datetime",
      hint: "Only candidates created after this date.",
    },
    {
      key: "ids",
      label: "Candidate IDs",
      type: "array",
      item: { type: "number" },
      hint: "Only these candidates, by id.",
    },
  ],
  output: [
    { key: "candidates", type: "array", label: "Candidates" },
    {
      key: "references",
      type: "array",
      label: "Related offers/placements the candidates reference",
    },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/candidates", {
      query: {
        query: input.query,
        sort: input.sort,
        limit: input.limit,
        offset: input.offset,
        offer_id: input.offerId,
        disqualified: flag(input.disqualified),
        deleted: flag(input.deleted),
        qualified: flag(input.qualified),
        created_after: input.createdAfter,
        ids: toNumberList(input.ids)?.join(","),
      },
    });
  },
};

export default candidateList;

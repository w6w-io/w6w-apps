import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  email?: string;
  shortcode?: string;
  stage?: string;
  createdAfter?: string;
  updatedAfter?: string;
  limit?: number;
  sinceId?: string;
  maxId?: string;
  pageUrl?: string;
}

/**
 * `GET /candidates` is account-wide when no filter is given, despite its own
 * summary ("Returns a collection of the job's candidates") — see
 * `lib/client.ts` for why the vendor's one-line summary is misleading here.
 */
const candidateList: ActionDefinition<Input> = {
  key: "candidate-list",
  type: "read",
  resource: "candidate",
  title: "List Candidates",
  description:
    "List candidates across the account, or narrow to one job/stage/email. With no filter set " +
    "this returns every candidate in the account. Required scope: `r_candidates`.",
  params: [
    { key: "email", label: "Email", type: "string", row: "filter" },
    { key: "shortcode", label: "Job shortcode", type: "string", row: "filter" },
    {
      key: "stage",
      label: "Stage slug",
      type: "string",
      row: "filter",
      hint: "From List Job Pipeline Stages, e.g. `phone-screen`.",
    },
    {
      key: "createdAfter",
      label: "Created after",
      type: "string",
      advanced: true,
      hint: "ISO 8601 or Unix time.",
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "string",
      advanced: true,
      hint: "ISO 8601 or Unix time.",
    },
    ...pagination,
  ],
  output: [
    { key: "candidates", type: "array", label: "Candidates" },
    { key: "nextUrl", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new WorkableClient(ctx);
    const page = input.pageUrl
      ? await client.list(input.pageUrl, "candidates")
      : await client.list("/candidates", "candidates", {
        query: compact({
          email: input.email,
          shortcode: input.shortcode,
          stage: input.stage,
          created_after: input.createdAfter,
          updated_after: input.updatedAfter,
          limit: input.limit,
          since_id: input.sinceId,
          max_id: input.maxId,
        }),
      });
    return { candidates: page.items, nextUrl: page.nextUrl };
  },
};

export default candidateList;

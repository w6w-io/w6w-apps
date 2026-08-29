import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/domain-finder` (Beta) — resolve a bare company name into its most
 * likely domain(s), the canonical first step before Domain Search or Email
 * Finder when only a company name is in hand.
 *
 * Free: it does not consume credits or decrement the monthly search quota,
 * though a call is still blocked once that quota is fully exhausted.
 */
interface Input {
  company: string;
  limit?: number;
  perfectMatch?: boolean;
}

const domainFinder: ActionDefinition<Input> = {
  key: "domain-finder",
  type: "search",
  resource: "domain",
  title: "Domain Finder",
  description: "Resolve a company name into its most likely domain(s). Free — no credits used.",
  params: [
    {
      key: "company",
      label: "Company name",
      type: "string",
      required: true,
      placeholder: "stripe",
      hint: "At least 3 characters. Case-insensitive.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 5,
      validation: { integer: true, min: 1, max: 10 },
      hint: "1–10 suggestions. Default 5.",
    },
    {
      key: "perfectMatch",
      label: "Perfect match only",
      type: "boolean",
      hint: "Return only suggestions with a very high similarity to the supplied name, for a " +
        "single confident answer rather than a candidate list.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Candidates: domain, company_name, logo, email_count" },
    { key: "meta", type: "object", label: "results, params" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/domain-finder", {
      query: compact({
        company: input.company,
        limit: input.limit,
        perfect_match: input.perfectMatch,
      }),
    });
  },
};

export default domainFinder;

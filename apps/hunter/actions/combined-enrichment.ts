import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/combined/find` — Combined Enrichment. Both the person AND their
 * company's information in one call, given only an email address — the
 * one-call alternative to running Email Enrichment then Company Enrichment
 * separately.
 *
 * Note the endpoint path: `/combined/find` — not `/combined-enrichment`.
 *
 * An email Hunter cannot find answers `404`, surfaced as an error.
 *
 * Rate limited to 15 requests/second and 500/minute.
 */
interface Input {
  email: string;
}

const combinedEnrichment: ActionDefinition<Input> = {
  key: "combined-enrichment",
  type: "read",
  resource: "enrichment",
  title: "Combined Enrichment",
  description: "Look up both the person and their company in one call, by email address.",
  params: [
    { key: "email", label: "Email", type: "string", required: true, placeholder: "matt@hunter.io" },
  ],
  output: [
    { key: "data", type: "object", label: "person{}, company{}" },
    { key: "meta", type: "object", label: "email echo" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/combined/find", { query: { email: input.email } });
  },
};

export default combinedEnrichment;

import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/people/find` — Email Enrichment. Everything Hunter has about a
 * person: name, location, timezone, employment, and social handles
 * (Twitter/X, LinkedIn, GitHub, Facebook, etc.), keyed by email address or
 * LinkedIn handle.
 *
 * Note the endpoint path: unlike the hyphenated Finder/Verifier endpoints,
 * Enrichment lives under `/people/find` — not `/email-enrichment`.
 *
 * Requires `email` or `linkedinHandle` (LinkedIn wins if both are given). A
 * person Hunter cannot find answers `404`, which this action surfaces as an
 * error rather than an empty result — there is no partial/empty success shape
 * documented for this endpoint.
 *
 * Rate limited to 15 requests/second and 500/minute.
 */
interface Input {
  email?: string;
  linkedinHandle?: string;
}

const emailEnrichment: ActionDefinition<Input> = {
  key: "email-enrichment",
  type: "read",
  resource: "enrichment",
  title: "Email Enrichment",
  description: "Look up everything Hunter has about a person, by email address or LinkedIn handle.",
  params: [
    { key: "email", label: "Email", type: "string", placeholder: "matt@hunter.io" },
    {
      key: "linkedinHandle",
      label: "LinkedIn handle",
      type: "string",
      hint: "Takes precedence over Email when both are given.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "name{}, email, location, employment{}, social handles" },
    { key: "meta", type: "object", label: "email echo" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/people/find", {
      query: compact({ email: input.email, linkedin_handle: input.linkedinHandle }),
    });
  },
};

export default emailEnrichment;

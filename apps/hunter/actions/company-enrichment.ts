import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/companies/find` — Company Enrichment. Everything Hunter has about
 * a company by domain: industry classification, description, headcount,
 * headquarters location, tech stack, social handles.
 *
 * Note the endpoint path: `/companies/find` — not `/company-enrichment`.
 *
 * A domain Hunter cannot find answers `404`, surfaced as an error.
 *
 * Rate limited to 15 requests/second and 500/minute.
 */
interface Input {
  domain: string;
}

const companyEnrichment: ActionDefinition<Input> = {
  key: "company-enrichment",
  type: "read",
  resource: "enrichment",
  title: "Company Enrichment",
  description: "Look up everything Hunter has about a company, by domain.",
  params: [
    { key: "domain", label: "Domain", type: "string", required: true, placeholder: "hunter.io" },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "name, category{}, description, location, metrics{}, tech[], social handles",
    },
    { key: "meta", type: "object", label: "domain echo" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/companies/find", { query: { domain: input.domain } });
  },
};

export default companyEnrichment;

import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";
import { domainSearchTypeOptions } from "../lib/params.ts";

/**
 * `GET /v2/email-count` — how many email addresses Hunter has for a domain
 * or company, broken down by type and department. Free of charge — this
 * counts, it does not return the addresses themselves (use Domain Search for
 * that).
 *
 * Requires `domain` or `company` (domain wins if both are given).
 *
 * Rate limited to 15 requests/second.
 */
interface Input {
  domain?: string;
  company?: string;
  type?: string;
}

const emailCount: ActionDefinition<Input> = {
  key: "email-count",
  type: "read",
  resource: "email",
  title: "Email Count",
  description: "Count the email addresses Hunter has for a domain or company, free of charge.",
  params: [
    { key: "domain", label: "Domain", type: "string", placeholder: "stripe.com" },
    {
      key: "company",
      label: "Company name",
      type: "string",
      hint: "Used only if Domain is empty. At least 3 characters.",
    },
    { key: "type", label: "Email type", type: "select", options: domainSearchTypeOptions },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "total, personal_emails, generic_emails, department{}, seniority{}",
    },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/email-count", {
      query: compact({ domain: input.domain, company: input.company, type: input.type }),
    });
  },
};

export default emailCount;

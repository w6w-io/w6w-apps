import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";
import { toCommaList } from "../lib/list.ts";
import {
  departmentOptions,
  domainSearchTypeOptions,
  domainSearchVerificationStatusOptions,
  paginationParams,
  senorityOptions,
} from "../lib/params.ts";

/**
 * `GET /v2/domain-search` — every email address Hunter has found for a domain.
 *
 * Requires `domain` or `company` (domain wins if both are given). A domain
 * with no hits still answers `200 OK` — `data.domain`/`pattern`/`organization`
 * come back `null` and `data.emails` is `[]`, which is why this action never
 * treats an empty result as an error.
 *
 * `meta.results_approximate: true` means `meta.results` is a lower bound
 * capped at 10,000 — narrow the filters to get an exact count.
 *
 * Rate limited to 15 requests/second and 500/minute.
 */
interface Input {
  domain?: string;
  company?: string;
  limit?: number;
  offset?: number;
  type?: string;
  seniority?: string[] | string;
  department?: string[] | string;
  decisionMaker?: boolean;
  requiredField?: string[] | string;
  verificationStatus?: string[] | string;
  jobTitles?: string;
  aggregations?: boolean;
}

const domainSearch: ActionDefinition<Input> = {
  key: "domain-search",
  type: "search",
  resource: "email",
  title: "Domain Search",
  description: "Find every email address Hunter has for a domain, with sources and confidence.",
  params: [
    { key: "domain", label: "Domain", type: "string", placeholder: "stripe.com" },
    {
      key: "company",
      label: "Company name",
      type: "string",
      hint: "Used only if Domain is empty. Supplying the domain gives better results.",
    },
    ...paginationParams(10, "Default 10, max 100 per page."),
    { key: "type", label: "Email type", type: "select", options: domainSearchTypeOptions },
    {
      key: "seniority",
      label: "Seniority",
      type: "multiselect",
      options: senorityOptions,
    },
    {
      key: "department",
      label: "Department",
      type: "multiselect",
      options: departmentOptions,
    },
    {
      key: "decisionMaker",
      label: "Decision makers only",
      type: "boolean",
      hint: "Leave unset to include both. `false` returns only people explicitly classified as " +
        "NOT a decision maker — undetermined people are excluded from that filter, though they " +
        "render `decision_maker: false` in an unfiltered response.",
    },
    {
      key: "requiredField",
      label: "Require field(s)",
      type: "multiselect",
      options: [
        { value: "full_name", label: "Full name" },
        { value: "position", label: "Position" },
        { value: "phone_number", label: "Phone number" },
      ],
    },
    {
      key: "verificationStatus",
      label: "Verification status",
      type: "multiselect",
      options: domainSearchVerificationStatusOptions,
    },
    {
      key: "jobTitles",
      label: "Job titles",
      type: "string",
      hint: "Comma-delimited. Matches common executive equivalents and word forms " +
        "(CTO ~ Chief Technology Officer; engineer ~ Engineering).",
    },
    {
      key: "aggregations",
      label: "Include aggregations",
      type: "boolean",
      hint: "Adds a meta.aggregations breakdown (department counts, decision-maker count, " +
        "personal/generic split) reflecting the filters applied.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Domain, pattern, organization and emails[]" },
    { key: "meta", type: "object", label: "results, results_approximate, limit, offset" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/domain-search", {
      query: compact({
        domain: input.domain,
        company: input.company,
        limit: input.limit,
        offset: input.offset,
        type: input.type,
        seniority: toCommaList(input.seniority),
        department: toCommaList(input.department),
        decision_maker: input.decisionMaker,
        required_field: toCommaList(input.requiredField),
        verification_status: toCommaList(input.verificationStatus),
        job_titles: input.jobTitles,
        aggregations: input.aggregations,
      }),
    });
  },
};

export default domainSearch;

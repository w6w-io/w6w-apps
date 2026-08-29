import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/email-finder` — guess the most likely email address for a named
 * person at a company.
 *
 * Requires one of `domain` / `company` / `linkedinHandle` AND (unless
 * `linkedinHandle` is given) a name — either `firstName` + `lastName` or
 * `fullName`.
 *
 * A verification runs automatically on every result (see `verification` in
 * the response) and **no credit is charged when no email is found**.
 *
 * Rate limited to 15 requests/second and 500/minute.
 */
interface Input {
  domain?: string;
  company?: string;
  linkedinHandle?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  maxDuration?: number;
}

const emailFinder: ActionDefinition<Input> = {
  key: "email-finder",
  type: "read",
  resource: "email",
  title: "Email Finder",
  description: "Find the most likely email address for a person, given a company and their name.",
  params: [
    { key: "domain", label: "Domain", type: "string", placeholder: "reddit.com" },
    {
      key: "company",
      label: "Company name",
      type: "string",
      hint: "Used only if Domain is empty. Supplying the domain gives better results.",
    },
    {
      key: "linkedinHandle",
      label: "LinkedIn handle",
      type: "string",
      hint: "When given, no name or company is required.",
    },
    { key: "firstName", label: "First name", type: "string", placeholder: "Alexis" },
    { key: "lastName", label: "Last name", type: "string", placeholder: "Ohanian" },
    {
      key: "fullName",
      label: "Full name",
      type: "string",
      hint: "Used only if First name / Last name are empty. Supplying both separately gives " +
        "better results.",
    },
    {
      key: "maxDuration",
      label: "Max duration (seconds)",
      type: "number",
      default: 10,
      validation: { integer: true, min: 3, max: 20 },
      hint: "A longer duration lets Hunter refine the result for better accuracy.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "email, score, position, verification, sources[]" },
    { key: "meta", type: "object", label: "params echo" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/email-finder", {
      query: compact({
        domain: input.domain,
        company: input.company,
        linkedin_handle: input.linkedinHandle,
        first_name: input.firstName,
        last_name: input.lastName,
        full_name: input.fullName,
        max_duration: input.maxDuration,
      }),
    });
  },
};

export default emailFinder;

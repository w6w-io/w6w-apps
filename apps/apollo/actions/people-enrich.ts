import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";

/**
 * `POST /people/match` — enrich data for one person.
 *
 * Apollo matches on whatever identifying fields you provide; more fields (name +
 * domain, or an email) improve match accuracy. A vague query (a bare name with no
 * domain/email) can answer `200` with no record matched, rather than an error.
 *
 * By default this does NOT return personal emails or phone numbers — set
 * `reveal_personal_emails`/`reveal_phone_number` for those. `reveal_phone_number`
 * requires `webhook_url`: Apollo returns the rest of the match synchronously, then
 * delivers the phone number to that webhook asynchronously (it can take several
 * minutes). The `run_waterfall_*` flags additionally check connected third-party data
 * sources; using either also requires `webhook_url`.
 *
 * Credit usage: 1–9 credits, and ONLY when credit-consuming data is actually found
 * (1 for demographics/email, +8 for a mobile phone) — a request that matches nothing
 * consumes 0 credits.
 */
interface Input {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  hashed_email?: string;
  organization_name?: string;
  domain?: string;
  id?: string;
  linkedin_url?: string;
  run_waterfall_email?: boolean;
  run_waterfall_phone?: boolean;
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
  webhook_url?: string;
}

const peopleEnrich: ActionDefinition<Input> = {
  key: "people-enrich",
  type: "read",
  resource: "person",
  title: "Enrich Person",
  description:
    "Look up and enrich one person's data by name, email, domain, LinkedIn URL or Apollo ID.",
  params: [
    { key: "first_name", label: "First name", type: "string", placeholder: "Tim" },
    { key: "last_name", label: "Last name", type: "string", placeholder: "Zheng" },
    { key: "name", label: "Full name", type: "string", hint: "Use instead of first/last name." },
    { key: "email", label: "Email", type: "string" },
    {
      key: "hashed_email",
      label: "Hashed email",
      type: "string",
      advanced: true,
      hint: "MD5 or SHA-256 hash of the email.",
    },
    { key: "organization_name", label: "Employer name", type: "string" },
    { key: "domain", label: "Employer domain", type: "string", placeholder: "apollo.io" },
    {
      key: "id",
      label: "Apollo person ID",
      type: "string",
      advanced: true,
      hint: "From the `people-search` action's `person_id` field.",
    },
    { key: "linkedin_url", label: "LinkedIn URL", type: "string" },
    {
      key: "reveal_personal_emails",
      label: "Reveal personal emails",
      type: "boolean",
      hint: "Consumes credits. Never revealed for a person in a GDPR-compliant region.",
    },
    {
      key: "reveal_phone_number",
      label: "Reveal phone number",
      type: "boolean",
      hint: "Consumes credits. Requires Webhook URL — the number is delivered there " +
        "asynchronously, not in this action's own result.",
    },
    {
      key: "run_waterfall_email",
      label: "Run waterfall email enrichment",
      type: "boolean",
      advanced: true,
      hint: "Checks connected third-party sources for an email. Requires Webhook URL.",
    },
    {
      key: "run_waterfall_phone",
      label: "Run waterfall phone enrichment",
      type: "boolean",
      advanced: true,
      hint: "Checks connected third-party sources for a phone number. Requires Webhook URL.",
    },
    {
      key: "webhook_url",
      label: "Webhook URL",
      type: "string",
      hint: "Required when Reveal phone number or either waterfall flag is set. Must be " +
        "publicly reachable over HTTPS.",
    },
  ],
  output: [{ key: "person", type: "object", label: "The enriched person (if matched)" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ person?: unknown }>("/people/match", {
      query: compact({
        first_name: input.first_name,
        last_name: input.last_name,
        name: input.name,
        email: input.email,
        hashed_email: input.hashed_email,
        organization_name: input.organization_name,
        domain: input.domain,
        id: input.id,
        linkedin_url: input.linkedin_url,
        run_waterfall_email: input.run_waterfall_email,
        run_waterfall_phone: input.run_waterfall_phone,
        reveal_personal_emails: input.reveal_personal_emails,
        reveal_phone_number: input.reveal_phone_number,
        webhook_url: input.webhook_url,
      }),
    });
    return { person: body.person ?? null };
  },
};

export default peopleEnrich;

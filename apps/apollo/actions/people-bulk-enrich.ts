import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";

/**
 * `POST /people/bulk_match` — enrich up to 10 people in one call.
 *
 * The reveal/waterfall flags are query parameters that apply to the WHOLE batch (there
 * is no per-person override), while `details` — the up-to-10 people to match — is a
 * genuine JSON body. Both are sent on the same request; see `lib/client.ts`'s module
 * doc for why that split matters here.
 *
 * Rate limit note: bulk enrichment has its own, tighter ceiling than the single-person
 * endpoint (20/minute, 100/hour on the Free plan vs 50/minute, 200/hour) — see
 * `docs.apollo.io/reference/rate-limits`.
 */
interface PersonDetail {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  hashed_email?: string;
  organization_name?: string;
  domain?: string;
  id?: string;
  linkedin_url?: string;
}

interface Input {
  details: PersonDetail[] | string;
  run_waterfall_email?: boolean;
  run_waterfall_phone?: boolean;
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
  webhook_url?: string;
}

function parseDetails(value: PersonDetail[] | string): PersonDetail[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new Error("details must be a JSON array of people to match");
  if (parsed.length === 0) throw new Error("details must contain at least one person");
  if (parsed.length > 10) throw new Error("details accepts at most 10 people per call");
  return parsed;
}

const peopleBulkEnrich: ActionDefinition<Input> = {
  key: "people-bulk-enrich",
  type: "read",
  resource: "person",
  title: "Bulk Enrich People",
  description:
    "Enrich up to 10 people in one call by name, email, domain, LinkedIn URL or Apollo ID.",
  params: [
    {
      key: "details",
      label: "People to enrich",
      type: "json",
      required: true,
      hint: "Array of up to 10 objects, each like the single Enrich Person params, e.g. " +
        '`[{"email": "tim@apollo.io"}, {"first_name": "Ada", "domain": "apollo.io"}]`.',
    },
    {
      key: "reveal_personal_emails",
      label: "Reveal personal emails",
      type: "boolean",
      hint: "Applies to every person in the batch. Consumes credits.",
    },
    {
      key: "reveal_phone_number",
      label: "Reveal phone numbers",
      type: "boolean",
      hint: "Applies to every person in the batch. Consumes credits. Requires Webhook URL.",
    },
    {
      key: "run_waterfall_email",
      label: "Run waterfall email enrichment",
      type: "boolean",
      advanced: true,
      hint: "Requires Webhook URL.",
    },
    {
      key: "run_waterfall_phone",
      label: "Run waterfall phone enrichment",
      type: "boolean",
      advanced: true,
      hint: "Requires Webhook URL.",
    },
    {
      key: "webhook_url",
      label: "Webhook URL",
      type: "string",
      hint: "Required when any reveal/waterfall flag above is set.",
    },
  ],
  output: [
    { key: "matches", type: "array", label: "One entry per person, in request order" },
    { key: "missing_records", type: "number", label: "Requested people that found no match" },
    { key: "credits_consumed", type: "number", label: "Credits this call consumed" },
  ],

  async execute(input, ctx) {
    const details = parseDetails(input.details);
    const body = await new ApolloClient(ctx).post<{
      matches?: unknown[];
      missing_records?: number;
      credits_consumed?: number;
    }>("/people/bulk_match", {
      query: compact({
        run_waterfall_email: input.run_waterfall_email,
        run_waterfall_phone: input.run_waterfall_phone,
        reveal_personal_emails: input.reveal_personal_emails,
        reveal_phone_number: input.reveal_phone_number,
        webhook_url: input.webhook_url,
      }),
      body: { details },
    });
    return {
      matches: body.matches ?? [],
      missing_records: body.missing_records ?? 0,
      credits_consumed: body.credits_consumed ?? 0,
    };
  },
};

export default peopleBulkEnrich;

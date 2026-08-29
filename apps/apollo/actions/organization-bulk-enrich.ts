import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `POST /organizations/bulk_enrich` — enrich up to 10 companies in one call.
 *
 * `details` (a JSON body array) takes precedence over the simpler `domains[]` query
 * parameter when both are set, per Apollo's own docs — so this action only exposes
 * `details`, which can also carry `linkedin_url`/`name`/`website` per company.
 */
interface CompanyDetail {
  domain?: string;
  linkedin_url?: string;
  name?: string;
  website?: string;
}

interface Input {
  details: CompanyDetail[] | string;
}

function parseDetails(value: CompanyDetail[] | string): CompanyDetail[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) {
    throw new Error("details must be a JSON array of companies to enrich");
  }
  if (parsed.length === 0) throw new Error("details must contain at least one company");
  if (parsed.length > 10) throw new Error("details accepts at most 10 companies per call");
  return parsed;
}

const organizationBulkEnrich: ActionDefinition<Input> = {
  key: "organization-bulk-enrich",
  type: "read",
  resource: "organization",
  title: "Bulk Enrich Organizations",
  description: "Enrich up to 10 companies in one call by domain, LinkedIn URL, name or website.",
  params: [
    {
      key: "details",
      label: "Companies to enrich",
      type: "json",
      required: true,
      hint: 'Array of up to 10 objects, e.g. `[{"domain": "apollo.io"}, {"name": "Microsoft"}]`.',
    },
  ],
  output: [{
    key: "organizations",
    type: "array",
    label: "One entry per company, in request order",
  }],

  async execute(input, ctx) {
    const details = parseDetails(input.details);
    const body = await new ApolloClient(ctx).post<{ organizations?: unknown[] }>(
      "/organizations/bulk_enrich",
      { body: { details } },
    );
    return { organizations: body.organizations ?? [] };
  },
};

export default organizationBulkEnrich;

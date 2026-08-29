import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";

/**
 * `GET /organizations/enrich` — enrich one company by domain, LinkedIn URL, name or
 * website. Providing more than one improves match accuracy.
 *
 * Credit usage: 1 credit per organization, whether or not a match is found.
 */
interface Input {
  domain?: string;
  linkedin_url?: string;
  name?: string;
  website?: string;
}

const organizationEnrich: ActionDefinition<Input> = {
  key: "organization-enrich",
  type: "read",
  resource: "organization",
  title: "Enrich Organization",
  description: "Look up and enrich one company's data by domain, LinkedIn URL, name or website.",
  params: [
    { key: "domain", label: "Domain", type: "string", placeholder: "apollo.io" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "string" },
    { key: "name", label: "Company name", type: "string" },
    { key: "website", label: "Website URL", type: "string" },
  ],
  output: [{
    key: "organization",
    type: "object",
    label: "The enriched organization (if matched)",
  }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ organization?: unknown }>(
      "/organizations/enrich",
      compact({
        domain: input.domain,
        linkedin_url: input.linkedin_url,
        name: input.name,
        website: input.website,
      }),
    );
    return { organization: body.organization ?? null };
  },
};

export default organizationEnrich;

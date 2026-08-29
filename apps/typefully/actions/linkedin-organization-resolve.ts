import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  organizationUrl: string;
}

/**
 * `GET /v2/social-sets/{social_set_id}/linkedin/organizations/resolve` —
 * resolve a public LinkedIn company/school URL into the metadata needed to
 * `@mention` it, including ready-to-paste `@[Name](urn:li:organization:ID)`
 * mention syntax for a LinkedIn post's text. Resolver-only — not a general
 * organization search endpoint.
 */
const linkedinOrganizationResolve: ActionDefinition<Input> = {
  key: "linkedin-organization-resolve",
  type: "read",
  resource: "linkedin-organization",
  title: "Resolve LinkedIn Organization",
  description: "Resolve a public LinkedIn company/school URL into mentionable organization data.",
  params: [
    socialSetIdParam,
    {
      key: "organizationUrl",
      label: "Organization URL",
      type: "string",
      required: true,
      placeholder: "https://www.linkedin.com/company/typefullycom",
      hint: "A public LinkedIn company or school profile URL.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "LinkedIn organization ID" },
    { key: "urn", type: "string", label: "urn:li:organization:ID" },
    { key: "mention_text", type: "string", label: "Ready-to-paste mention syntax" },
    { key: "name", type: "string", label: "Display name, or null" },
    { key: "vanity_name", type: "string", label: "Vanity name, or null" },
    { key: "website", type: "string", label: "Website, or null" },
    { key: "logo_url", type: "string", label: "Logo URL, or null" },
    { key: "url", type: "string", label: "Public LinkedIn company URL, or null" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/linkedin/organizations/resolve`,
      { query: { organization_url: input.organizationUrl } },
    );
  },
};

export default linkedinOrganizationResolve;

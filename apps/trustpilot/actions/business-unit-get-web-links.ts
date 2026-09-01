import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `GET /v1/business-units/{businessUnitId}/web-links` — public, API-Key auth.
 *
 * The public-facing URLs for this Business Unit's profile, review-collection ("evaluate")
 * page, and its embeddable form — useful for a workflow that emails a customer a link to
 * leave a review, without going through the Invitations API.
 */
interface Input {
  businessUnitId: string;
  locale: string;
}

interface Output {
  locale?: string;
  profileUrl?: string;
  evaluateUrl?: string;
  evaluateEmbedUrl?: string;
}

const businessUnitGetWebLinks: ActionDefinition<Input, Output> = {
  key: "business-unit-get-web-links",
  type: "read",
  resource: "business-unit",
  title: "Get Business Unit Web Links",
  description: "Get a Business Unit's public profile, review and embeddable-form URLs.",
  params: [
    businessUnitIdParam,
    {
      key: "locale",
      label: "Locale",
      type: "string",
      required: true,
      placeholder: "en-US",
      hint: "The locale used to generate the links (e.g. `da-DK` produces trustpilot.dk links).",
    },
  ],
  output: [
    { key: "locale", type: "string", label: "Locale" },
    { key: "profileUrl", type: "string", label: "Profile URL" },
    { key: "evaluateUrl", type: "string", label: "Review (evaluate) URL" },
    { key: "evaluateEmbedUrl", type: "string", label: "Embeddable review form URL" },
  ],

  async execute(input, ctx) {
    return await requestApi<Output>(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/web-links`,
      { query: { locale: input.locale } },
    );
  },
};

export default businessUnitGetWebLinks;

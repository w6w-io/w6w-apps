import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInConversionsClient, sponsoredAccountUrn } from "../lib/client.ts";
import { accountIdParam, conversionIdParam } from "../lib/params.ts";

interface Input {
  conversionId: string;
  accountId: string;
}

/**
 * `GET /rest/conversions/{id}?account={sponsoredAccountUrn}` — fetch one
 * Conversion Rule by its numeric id. The account URN is required in the
 * query string per the vendor's documented shape, even though the id alone
 * is already globally unique.
 */
const conversionRuleGet: ActionDefinition<Input> = {
  key: "conversion-rule-get",
  type: "read",
  resource: "conversion-rule",
  title: "Get Conversion Rule",
  description: "Fetch one Conversion Rule by ID.",
  params: [conversionIdParam, accountIdParam],
  output: [
    { key: "id", type: "number", label: "Conversion Rule ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Conversion type" },
    { key: "conversionMethod", type: "string", label: "Conversion method" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "attributionType", type: "string", label: "Attribution model" },
    { key: "postClickAttributionWindowSize", type: "number", label: "Post-click window (days)" },
    {
      key: "viewThroughAttributionWindowSize",
      type: "number",
      label: "View-through window (days)",
    },
    { key: "campaigns", type: "array", label: "Associated campaign URNs" },
    { key: "associatedCampaigns", type: "array", label: "Associated campaigns with timestamps" },
  ],

  execute(input, ctx) {
    const client = new LinkedInConversionsClient(ctx);
    return client.request(`/rest/conversions/${bareId(input.conversionId)}`, {
      query: { account: sponsoredAccountUrn(input.accountId) },
    });
  },
};

export default conversionRuleGet;

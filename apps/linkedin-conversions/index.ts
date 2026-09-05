/**
 * LinkedIn Conversions — the LinkedIn Conversions API: Conversion Rules,
 * their association with Campaigns, and streaming Conversion Events, over
 * the versioned `/rest/` surface at `api.linkedin.com`.
 *
 * This is a **separate product** from both other LinkedIn apps in this
 * pack: `linkedin` covers the member/social Posts API, and `linkedin-ads`
 * covers campaign management (Ad Accounts, Campaigns, Creatives, Ad
 * Analytics, Matched Audiences). All three share a host and Rest.li
 * transport conventions but nothing else — different auth products,
 * different approval gates, different resources. See `lib/client.ts` for
 * the full transport findings and `README.md` for what's covered and what's
 * deliberately left out.
 *
 * Every endpoint, field and enum here was verified on 2026-09-05 against
 * Microsoft Learn's LinkedIn Marketing docs
 * (`integrations/ads-reporting/conversions-api`,
 * `integrations/ads-reporting/conversions-api-schema`,
 * `integrations/ads-reporting/conversion-tracking`) plus live,
 * unauthenticated probes against `api.linkedin.com`. Nothing here came from
 * a third-party integration directory.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import conversionRuleCreate from "./actions/conversion-rule-create.ts";
import conversionRuleGet from "./actions/conversion-rule-get.ts";
import conversionRuleList from "./actions/conversion-rule-list.ts";
import conversionRuleUpdate from "./actions/conversion-rule-update.ts";

import campaignConversionAssociate from "./actions/campaign-conversion-associate.ts";
import campaignConversionDelete from "./actions/campaign-conversion-delete.ts";

import conversionEventReport from "./actions/conversion-event-report.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Conversion Rules
    conversionRuleCreate,
    conversionRuleGet,
    conversionRuleList,
    conversionRuleUpdate,
    // Campaign Conversions (association)
    campaignConversionAssociate,
    campaignConversionDelete,
    // Conversion Events
    conversionEventReport,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

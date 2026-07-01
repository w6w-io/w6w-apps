/**
 * Facebook Lead Ads — w6w port of n8n's `FacebookLeadAdsTrigger` node.
 *
 * IMPORTANT: n8n's node is trigger-only — it registers a Facebook Graph API
 * webhook subscription (`object=page, fields=[leadgen]`) and emits an item for
 * every new lead. w6w has no trigger model yet, so this port ships only the
 * *polling*-style actions n8n's fallback path uses:
 *
 *   - `list-forms`         → `GET /{page_id}/leadgen_forms`
 *   - `list-recent-leads`  → `GET /{form_id}/leads`
 *
 * Wiring up webhook receivers (challenge verification, HMAC signature check,
 * `appsecret`-based app access tokens for subscription lifecycle) is deferred
 * until w6w adds a trigger runtime. When that lands, port the webhookMethods
 * (`checkExists` / `create` / `delete`) and the `sha256=` signature check from
 * `.tmp/n8n/packages/nodes-base/nodes/FacebookLeadAds/FacebookLeadAdsTrigger.node.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listForms from "./actions/list-forms.ts";
import listRecentLeads from "./actions/list-recent-leads.ts";

export default {
  actions: [listForms, listRecentLeads],
  auth: [oauth2],
} satisfies AppDefinition;

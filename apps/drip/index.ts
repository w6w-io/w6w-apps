/**
 * Drip (getdrip.com) — email marketing built around subscribers, tags and
 * custom events.
 *
 * Every endpoint except `GET /v2/accounts` and `GET /v2/user` is scoped
 * under `/v2/:account_id/...`, so the account id is collected once as an
 * Auth field (see `auth/api-key.ts`) rather than repeated on every action —
 * the same shape as `apps/freshdesk`'s per-account `domain` field.
 *
 * Deliberately absent, because they could not be verified against
 * developer.drip.com without guessing at request/response shapes not shown
 * on the page: Single-Email Campaigns (broadcasts), Workflows, Forms,
 * Conversions, Webhooks, Orders/Shopper-Activity, and the Batch API. The
 * core subscriber/tag/event/campaign surface below covers what a workflow
 * most commonly needs and is verified end to end against the vendor's own
 * reference (curl examples + documented HTTP endpoints), not inferred from
 * a sibling app.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listAccounts from "./actions/list-accounts.ts";

import createOrUpdateSubscriber from "./actions/create-or-update-subscriber.ts";
import listSubscribers from "./actions/list-subscribers.ts";
import getSubscriber from "./actions/get-subscriber.ts";
import deleteSubscriber from "./actions/delete-subscriber.ts";
import unsubscribeSubscriber from "./actions/unsubscribe-subscriber.ts";

import applyTag from "./actions/apply-tag.ts";
import removeTag from "./actions/remove-tag.ts";
import listTags from "./actions/list-tags.ts";

import recordEvent from "./actions/record-event.ts";
import listEventActions from "./actions/list-event-actions.ts";

import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";

import listCustomFieldIdentifiers from "./actions/list-custom-field-identifiers.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // account
    listAccounts,
    // subscriber
    createOrUpdateSubscriber,
    listSubscribers,
    getSubscriber,
    deleteSubscriber,
    unsubscribeSubscriber,
    // tag
    applyTag,
    removeTag,
    listTags,
    // event
    recordEvent,
    listEventActions,
    // campaign
    listCampaigns,
    getCampaign,
    // custom field
    listCustomFieldIdentifiers,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

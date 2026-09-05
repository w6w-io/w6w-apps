/**
 * Givebutter — the nonprofit fundraising platform: campaigns, contacts (donor
 * CRM), transactions, funds, households, recurring plans, tickets, payouts,
 * outbound messages and webhooks, over the Givebutter API v1
 * (`api.givebutter.com`).
 *
 * Every path, verb, request/response field and enum in this app was verified
 * on 2026-09-05 against Givebutter's own OpenAPI 3.1 document
 * (`https://givebutter.com/docs/api.json`, 536,523 bytes, `info.title`
 * "Givebutter API Documentation") plus live probes against
 * `api.givebutter.com`. Nothing here came from a third-party integration
 * directory or the widget/embed docs, which are a different surface entirely.
 *
 * The findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **The docs' own error shape isn't the one on the wire**
 *     (`lib/client.ts`). Every response schema and every prose docs page
 *     shows a flat `{"message": "..."}`; a live 401 answers
 *     `{"error": {"message": "Unauthorized"}}`. `formatGivebutterError`
 *     reads both.
 *  2. **A nonexistent id doesn't get a JSON 404 — it gets the marketing
 *     site** (`lib/client.ts`). Route-model binding appears to run before
 *     the auth check, so an id that resolves to no row anywhere in
 *     Givebutter's system (not just outside the caller's own org) falls
 *     through to a branded Webflow 404 HTML page — indistinguishable, from
 *     the wire alone, from "wrong id" and "right id, no permission".
 *  3. **The Rate Limits doc page is wrong** (`health/quota.ts`). It states
 *     500 requests/minute; every response measured live carried
 *     `x-ratelimit-limit: 200`.
 *  4. **`/sso/v1/*` looks like two more API-key endpoints and isn't**
 *     (`auth/api-key.ts`). Listed in the OpenAPI doc with the same bearer
 *     security requirement as everything else, a live bearer token gets a
 *     302 redirect to `/login` instead of 200 or 401 — a separate,
 *     session-based SSO flow. This app declares no actions against them.
 *  5. **`emails`/`phones` mean different shapes on create vs update**
 *     (`actions/contact-update.ts`). `StoreContactRequest` takes plain
 *     string arrays; `UpdateContactRequest` takes
 *     `{value, type, is_primary}` objects for the same field names.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignUpdate from "./actions/campaign-update.ts";
import campaignDelete from "./actions/campaign-delete.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactRestore from "./actions/contact-restore.ts";
import contactTagsAdd from "./actions/contact-tags-add.ts";
import contactTagsRemove from "./actions/contact-tags-remove.ts";
import contactTagsSync from "./actions/contact-tags-sync.ts";

import fundList from "./actions/fund-list.ts";
import fundGet from "./actions/fund-get.ts";
import fundCreate from "./actions/fund-create.ts";
import fundUpdate from "./actions/fund-update.ts";
import fundDelete from "./actions/fund-delete.ts";

import transactionList from "./actions/transaction-list.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionCreate from "./actions/transaction-create.ts";
import transactionUpdate from "./actions/transaction-update.ts";

import householdList from "./actions/household-list.ts";
import householdGet from "./actions/household-get.ts";
import householdCreate from "./actions/household-create.ts";
import householdUpdate from "./actions/household-update.ts";
import householdDelete from "./actions/household-delete.ts";

import payoutList from "./actions/payout-list.ts";
import payoutGet from "./actions/payout-get.ts";

import pledgeList from "./actions/pledge-list.ts";
import pledgeGet from "./actions/pledge-get.ts";

import planList from "./actions/plan-list.ts";
import planGet from "./actions/plan-get.ts";

import ticketList from "./actions/ticket-list.ts";
import ticketGet from "./actions/ticket-get.ts";

import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Campaigns
    campaignList,
    campaignGet,
    campaignCreate,
    campaignUpdate,
    campaignDelete,
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactRestore,
    contactTagsAdd,
    contactTagsRemove,
    contactTagsSync,
    // Funds
    fundList,
    fundGet,
    fundCreate,
    fundUpdate,
    fundDelete,
    // Transactions
    transactionList,
    transactionGet,
    transactionCreate,
    transactionUpdate,
    // Households
    householdList,
    householdGet,
    householdCreate,
    householdUpdate,
    householdDelete,
    // Payouts (read-only in the API)
    payoutList,
    payoutGet,
    // Pledges (read-only in the API)
    pledgeList,
    pledgeGet,
    // Recurring plans (read-only in the API)
    planList,
    planGet,
    // Tickets (read-only in the API)
    ticketList,
    ticketGet,
    // Messages (read-only in the API)
    messageList,
    messageGet,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  // API key only. Givebutter publishes no OAuth surface for third-party apps;
  // the two `/sso/v1/*` endpoints that look like they might be a session/JWT
  // alternative are unreachable with a bearer API key (see module doc, #4).
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

/**
 * Feedly for Threat Intelligence (Enterprise) — `api.feedly.com`.
 *
 * Every path, verb, query parameter and body field in this app was verified
 * on 2026-09-06 against Feedly's own reference documentation
 * (`https://developers.feedly.com`, discovered via its `llms.txt` index) plus
 * live, unauthenticated probes against `api.feedly.com` and
 * `status.feedly.com`. See `README.md` for the full verification log,
 * including what this app deliberately leaves out and why.
 *
 * Two findings that shaped the design:
 *
 *  1. **The whole current API is Feedly's Enterprise Threat Intelligence
 *     product.** A self-service API token is only issued to Enterprise
 *     accounts, minted by an admin from `feedly.com/i/team/api`. There is no
 *     OAuth2 flow anywhere in the reference — every request just carries
 *     `Authorization: Bearer <token>` (`auth/bearer-token.ts`). The gate is
 *     commercial, not technical: this app is a plain bearer-token
 *     integration, buildable and testable with `ctx.fetch` exactly like any
 *     other, but only usable by a tenant that already has an Enterprise
 *     contract.
 *  2. **`/v3/profile` is undocumented in the current reference index, yet
 *     the single best credential probe.** It appears only as the
 *     Authorization page's own curl example, but a live probe confirms it
 *     needs no team-admin privilege — unlike `/v3/enterprise/users` and
 *     `/v3/enterprise/collections`, which both 403 a non-admin token
 *     (`auth/bearer-token.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import articlesCollect from "./actions/articles-collect.ts";
import articlesSearch from "./actions/articles-search.ts";
import articleGet from "./actions/article-get.ts";
import articlesGetMultiple from "./actions/articles-get-multiple.ts";
import articleAnnotate from "./actions/article-annotate.ts";

import boardsList from "./actions/boards-list.ts";
import boardArticleAdd from "./actions/board-article-add.ts";
import boardArticleRemove from "./actions/board-article-remove.ts";

import foldersList from "./actions/folders-list.ts";
import aiFeedsList from "./actions/ai-feeds-list.ts";
import enterpriseUsersList from "./actions/enterprise-users-list.ts";

import webhooksList from "./actions/webhooks-list.ts";
import webhookUpsert from "./actions/webhook-upsert.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Articles
    articlesCollect,
    articlesSearch,
    articleGet,
    articlesGetMultiple,
    articleAnnotate,
    // Boards
    boardsList,
    boardArticleAdd,
    boardArticleRemove,
    // Folders / AI Feeds / Users
    foldersList,
    aiFeedsList,
    enterpriseUsersList,
    // Webhooks
    webhooksList,
    webhookUpsert,
    webhookDelete,
  ],
  // Enterprise self-service token only. Feedly publishes no OAuth2 surface
  // for this API — see the module doc above and README.md.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

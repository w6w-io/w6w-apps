/**
 * Dust — the AI agent/assistant platform: list, search and inspect agents,
 * drive conversations (create, message, cancel generation, attach content
 * fragments), and read/search the workspace's spaces and data sources, over
 * the Dust REST API (`dust.tt` / `eu.dust.tt`).
 *
 * Every path, verb, query parameter and body field in this app was verified
 * on 2026-09-05 against the vendor's own OpenAPI 3.0 document
 * (`raw.githubusercontent.com/dust-tt/dust/main/front-api/public/swagger.json`
 * — `dust-tt/dust` is the product's own monorepo — `info.version` `1.0.2`, 92
 * paths, cross-checked against the same document re-served through
 * `docs.dust.tt/api-reference/**\/*.md`) plus live probes against
 * `dust.tt` and `status.dust.tt`. Nothing here came from a third-party
 * integration directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two regional hosts that don't cross-authenticate** (`lib/client.ts`,
 *     `auth/api-key.ts`). A workspace lives in exactly one of
 *     `dust.tt` (us-central1) or `eu.dust.tt` (europe-west1); the wrong one
 *     for an otherwise-correct key looks exactly like a bad key.
 *  2. **The bearer value's shape is checked before it's looked up**
 *     (`auth/api-key.ts`). A key not starting `sk-` gets a distinct
 *     `malformed_authorization_header_error` rather than the generic
 *     `invalid_api_key_error` a wrong-but-shaped key gets — verified live,
 *     not from the docs (which don't state this).
 *  3. **The legacy "Dust Apps" surface (`Apps`/`Runs` tag) is deprecated** —
 *     `docs.dust.tt/docs/developer-platform/legacy-dust-apps` states
 *     "creation of new Dust Apps is deactivated." This app deliberately
 *     implements none of it; do not add it without re-checking that notice.
 *
 * One documented gap: Create Message's `200` response schema is a verbatim
 * copy of its OWN request body, which cannot be the real response — see
 * `actions/message-create.ts` for what this app does about it instead of
 * guessing.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import agentList from "./actions/agent-list.ts";
import agentGet from "./actions/agent-get.ts";
import agentSearch from "./actions/agent-search.ts";

import conversationCreate from "./actions/conversation-create.ts";
import conversationGet from "./actions/conversation-get.ts";
import messageCreate from "./actions/message-create.ts";
import conversationCancel from "./actions/conversation-cancel.ts";
import contentFragmentCreate from "./actions/content-fragment-create.ts";

import spaceList from "./actions/space-list.ts";
import dataSourceList from "./actions/data-source-list.ts";
import dataSourceSearch from "./actions/data-source-search.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Agents
    agentList,
    agentGet,
    agentSearch,
    // Conversations
    conversationCreate,
    conversationGet,
    messageCreate,
    conversationCancel,
    contentFragmentCreate,
    // Spaces & data sources
    spaceList,
    dataSourceList,
    dataSourceSearch,
  ],
  // API key only. Dust publishes no OAuth surface for third-party apps; a
  // workspace-scoped key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

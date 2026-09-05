/**
 * Devin — Cognition Labs' autonomous coding agent. Start sessions, follow
 * their progress, message them, and manage the attachments and secrets that
 * feed them, over the Devin API **v3** (`api.devin.ai`).
 *
 * Every path, verb, query parameter and body field in this app was read
 * directly out of the embedded OpenAPI schema on Cognition's own
 * `docs.devin.ai/api-reference/v3/*` pages (Mintlify-hosted; the schema is
 * inlined in each page's own React payload, not a separate machine-readable
 * document at a stable URL) plus live, unauthenticated probes against
 * `api.devin.ai`, all on 2026-09-05. Nothing here came from a third-party
 * integration directory.
 *
 * ## The most important finding: v1 is the deprecated one, not v3
 *
 * Devin ships three API generations. It would be easy to build against v1
 * (`GET /v1/sessions`, `apk_`-prefixed keys) — it is the smallest, oldest
 * surface and it still answers on the wire (an unauthenticated probe returns
 * a real `401 {"detail":"Unauthorized"}`, not a 404). But
 * `docs.devin.ai/api-reference/authentication` states outright:
 *
 * > Legacy API keys are deprecated. Use API v3 with service user
 * > authentication.
 *
 * and the v3 overview adds that v1/v2 "will be deprecated in the future"
 * with "at least 30 days notice," while v3 is "coming out of beta" and "the
 * primary API for all Devin functionality." Reachability is not the same
 * question as currency — this app is built entirely against v3.
 *
 * ## Small and session-shaped on purpose
 *
 * v3 also exposes a large enterprise-admin surface — automations, playbooks,
 * knowledge notes, code scans, audit logs, org/member/role management, IdP
 * groups, usage metrics, billing. None of it is here: this app covers exactly
 * the session-oriented path a workflow needs (create, get, list, archive,
 * terminate a session; send and list messages; upload an attachment and list
 * a session's; create, list and delete an org secret), because that is what
 * "call Devin to do coding work from a workflow" means. The rest is an
 * operator console's job, not a workflow step's.
 *
 * Left out even from that smaller surface, and said here once rather than
 * repeated in every action file: `create_as_user_id` / `message_as_user_id`
 * (impersonating another org member — needs the separate
 * `ImpersonateOrgSessions` permission), inline `session_secrets` (ephemeral
 * secrets passed straight in the create body — `secretIds`, referencing a
 * secret created once via `secret-create`, keeps a value out of every
 * workflow run's params instead), and `structured_output_schema` (a
 * JSON-Schema contract for a session's final answer).
 *
 * ## Every organization id lives on the Connection, not on the Action
 *
 * Every v3 endpoint below `/v3/organizations/{org_id}/...` needs one. Like
 * Freshdesk's account subdomain, the org id identifies the account a service
 * user (or a PAT's chosen scope) was provisioned into, so it is collected
 * once at connect time and echoed onto the Connection's display data — see
 * `auth/api-key.ts` and `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sessionCreate from "./actions/session-create.ts";
import sessionGet from "./actions/session-get.ts";
import sessionList from "./actions/session-list.ts";
import sessionArchive from "./actions/session-archive.ts";
import sessionTerminate from "./actions/session-terminate.ts";
import sessionMessageSend from "./actions/session-message-send.ts";
import sessionMessageList from "./actions/session-message-list.ts";
import sessionAttachmentList from "./actions/session-attachment-list.ts";
import attachmentUpload from "./actions/attachment-upload.ts";
import secretCreate from "./actions/secret-create.ts";
import secretList from "./actions/secret-list.ts";
import secretDelete from "./actions/secret-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Sessions
    sessionCreate,
    sessionGet,
    sessionList,
    sessionArchive,
    sessionTerminate,
    // Messages
    sessionMessageSend,
    sessionMessageList,
    // Attachments
    sessionAttachmentList,
    attachmentUpload,
    // Secrets
    secretCreate,
    secretList,
    secretDelete,
  ],
  // API key only (Service User API Key or Personal Access Token, both
  // cog_-prefixed). Devin publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

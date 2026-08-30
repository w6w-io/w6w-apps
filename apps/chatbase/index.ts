/**
 * Chatbase — build AI agents on your own content, and manage them, their
 * chat, their knowledge sources, their helpdesk, and their WhatsApp channel
 * over the API.
 *
 * Every path, verb, body field, and error code in this app was verified on
 * 2026-08-29 against Chatbase's own machine-readable OpenAPI 3.1 document
 * (`www.chatbase.co/docs/api-v2-merged-openapi.json`, `info.version` `2.0.0`,
 * 323,394 bytes) plus the prose pages under `/docs/api-v2/*` and live probes
 * against `www.chatbase.co`. Nothing here came from a third-party
 * integration directory. See `lib/client.ts` for the full findings: the
 * v1/v2 coexistence, the three response envelope shapes, and the rate-limit
 * headers every response carries.
 *
 * Three things shaped this app's scope, each documented where it matters:
 *
 *  1. **v2 over v1, except leads.** Chatbase itself tells v1 users to move to
 *     v2 ("Looking for API v2? … Check out the API v2 Reference"). Every
 *     action here targets v2 except `lead-list`, which reads v1's
 *     `/get-leads` — v2 has no leads endpoint at all as of this writing.
 *  2. **No usable vendor status page.** `chatbase.statuspage.io` redirects
 *     to `statuspage.io` itself (an unclaimed-page decoy) and
 *     `status.chatbase.co` is a dead, certificate-expired host. This app's
 *     `service` health check reads the API's own unauthenticated `GET
 *     /health` instead — see `health/service.ts`.
 *  3. **File-type knowledge sources are out of scope.** Chatbase serves
 *     PDF/DOC/DOCX uploads from a *different* host (`files.chatbase.co`) as
 *     binary multipart bodies, and this sandbox's `ctx.fetch` coerces every
 *     request body to a string on its way to the network — the same
 *     limitation that caps this pack's Box and Dropbox uploads to text
 *     content. Text, Q&A, and link sources (`source-create` / `source-
 *     update`) are unaffected and are fully covered.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import agentList from "./actions/agent-list.ts";
import agentGet from "./actions/agent-get.ts";
import agentCreate from "./actions/agent-create.ts";
import agentUpdate from "./actions/agent-update.ts";
import agentDelete from "./actions/agent-delete.ts";
import agentTrain from "./actions/agent-train.ts";
import agentClone from "./actions/agent-clone.ts";
import agentAutoRetrainToggle from "./actions/agent-auto-retrain-toggle.ts";

import agentChat from "./actions/agent-chat.ts";
import messageRetry from "./actions/message-retry.ts";
import toolResultSubmit from "./actions/tool-result-submit.ts";

import conversationList from "./actions/conversation-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationMessagesList from "./actions/conversation-messages-list.ts";
import conversationUserList from "./actions/conversation-user-list.ts";
import messageFeedbackUpdate from "./actions/message-feedback-update.ts";

import sourceSummaryGet from "./actions/source-summary-get.ts";
import sourceList from "./actions/source-list.ts";
import sourceGet from "./actions/source-get.ts";
import sourceCreate from "./actions/source-create.ts";
import sourceUpdate from "./actions/source-update.ts";
import sourceDelete from "./actions/source-delete.ts";
import sourceRestore from "./actions/source-restore.ts";

import ticketStatusList from "./actions/ticket-status-list.ts";
import teamList from "./actions/team-list.ts";
import ticketCreate from "./actions/ticket-create.ts";
import ticketList from "./actions/ticket-list.ts";
import ticketSearch from "./actions/ticket-search.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketMessagesList from "./actions/ticket-messages-list.ts";
import ticketMessageAdd from "./actions/ticket-message-add.ts";

import whatsappTemplateList from "./actions/whatsapp-template-list.ts";
import whatsappTemplateSend from "./actions/whatsapp-template-send.ts";

import leadList from "./actions/lead-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Agents
    agentList,
    agentGet,
    agentCreate,
    agentUpdate,
    agentDelete,
    agentTrain,
    agentClone,
    agentAutoRetrainToggle,
    // Chat
    agentChat,
    messageRetry,
    toolResultSubmit,
    // Conversations
    conversationList,
    conversationGet,
    conversationMessagesList,
    conversationUserList,
    messageFeedbackUpdate,
    // Sources
    sourceSummaryGet,
    sourceList,
    sourceGet,
    sourceCreate,
    sourceUpdate,
    sourceDelete,
    sourceRestore,
    // Helpdesk
    ticketStatusList,
    teamList,
    ticketCreate,
    ticketList,
    ticketSearch,
    ticketGet,
    ticketUpdate,
    ticketMessagesList,
    ticketMessageAdd,
    // WhatsApp
    whatsappTemplateList,
    whatsappTemplateSend,
    // Leads (v1 — see module doc)
    leadList,
  ],
  // API key only. Chatbase publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

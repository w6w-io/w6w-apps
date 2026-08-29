/**
 * Kustomer — customer-service CRM platform (kustomer.com).
 *
 * Covers the four resources core to a workflow's use of Kustomer: customers,
 * conversations (with their messages, notes and tags), custom objects
 * (Klasses/KObjects), access management (teams/users) and CSAT surveys.
 *
 * Every organization has its own API host (`{org}.api.kustomerapp.com`) — see
 * `lib/client.ts` for how the org subdomain is collected as an Auth field
 * (mirroring `apps/freshdesk`) rather than a per-action param, and why
 * `w6w.network.allow` declares the `*.api.kustomerapp.com` wildcard.
 *
 * Deliberately absent, and why (see each action/README for detail):
 *   - Composing and sending outbound customer messages (Kustomer's `Draft`
 *     resource) — its request schema is a `oneOf` discriminated per channel
 *     with a materially different shape per branch; `message-create` only
 *     logs an already-produced message on the timeline.
 *   - `DELETE /conversations/{id}/tags` — its OAS declares no body and no
 *     query parameter naming which tags to remove.
 *   - `POST /customers/search` and the audit-log / bulk-operation / SLA /
 *     spam / attachment / draft-forward surfaces — outside this app's
 *     customers/conversations/messages/notes/klasses/access-management/
 *     satisfaction scope.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerFindByEmail from "./actions/customer-find-by-email.ts";
import customerFindByExternalId from "./actions/customer-find-by-external-id.ts";
import customerList from "./actions/customer-list.ts";
import customerUpdate from "./actions/customer-update.ts";

import conversationCreate from "./actions/conversation-create.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationList from "./actions/conversation-list.ts";
import conversationUpdate from "./actions/conversation-update.ts";
import conversationAddTag from "./actions/conversation-add-tag.ts";

import messageCreate from "./actions/message-create.ts";
import messageList from "./actions/message-list.ts";

import noteCreate from "./actions/note-create.ts";
import noteList from "./actions/note-list.ts";

import klassList from "./actions/klass-list.ts";
import kobjectList from "./actions/kobject-list.ts";
import kobjectCreate from "./actions/kobject-create.ts";

import teamList from "./actions/team-list.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import satisfactionSurveyList from "./actions/satisfaction-survey-list.ts";
import satisfactionResponseGet from "./actions/satisfaction-response-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    // customer
    customerCreate,
    customerGet,
    customerFindByEmail,
    customerFindByExternalId,
    customerList,
    customerUpdate,
    // conversation
    conversationCreate,
    conversationGet,
    conversationList,
    conversationUpdate,
    conversationAddTag,
    // message
    messageCreate,
    messageList,
    // note
    noteCreate,
    noteList,
    // klass / kobject
    klassList,
    kobjectList,
    kobjectCreate,
    // access management
    teamList,
    userList,
    userGet,
    // satisfaction
    satisfactionSurveyList,
    satisfactionResponseGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, domain],
} satisfies AppDefinition;

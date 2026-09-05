/**
 * Jira Service Management Cloud — ITSM / service-desk product, hosted on the
 * same per-tenant `*.atlassian.net` site as the sibling `jira` app but served
 * by its own REST surface, `/rest/servicedeskapi`, verified live against
 * https://developer.atlassian.com/cloud/jira/service-desk/swagger.json.
 *
 * Three things shape the code and are worth reading before changing it:
 *
 *   - **Same site, different API.** Auth is identical in shape to the sibling
 *     `jira` app (Basic email+API-token against the site host, or OAuth 2.0
 *     3LO against Atlassian's gateway) because it's the same Atlassian Cloud
 *     site — but every action here calls `/rest/servicedeskapi`, never
 *     `/rest/api/3`. `lib/client.ts` resolves the same dual-host base the
 *     sibling app does; only `API_PATH` differs.
 *   - **Plain strings, not ADF, by default.** `RequestCreateDTO.isAdfRequest`
 *     and `CommentCreateDTO` both take plain text unless a caller opts into
 *     Atlassian Document Format — the reverse of Jira Software's v3 API,
 *     which the sibling `jira` app must always encode as ADF.
 *   - **Status is not writable.** As with Jira Software, a request's status
 *     changes only by executing a workflow transition, and the available
 *     transitions depend on the current state — hence
 *     `request-get-transitions` feeding `request-transition`.
 *
 * Deliberately absent: attachments (multipart upload, which the sandbox's
 * `ctx.fetch` is not for), approvals, the knowledge base, and
 * customer/organization membership management (`POST /customer`,
 * organization property CRUD) — none of these have a stable, non-experimental
 * contract this app can rely on without the `X-ExperimentalApi: opt-in`
 * header some of Jira Service Management's REST surface still requires.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import servicedeskGetMany from "./actions/servicedesk-get-many.ts";
import servicedeskGet from "./actions/servicedesk-get.ts";

import requesttypeGetMany from "./actions/requesttype-get-many.ts";

import requestCreate from "./actions/request-create.ts";
import requestGet from "./actions/request-get.ts";
import requestSearch from "./actions/request-search.ts";
import requestGetStatus from "./actions/request-get-status.ts";
import requestGetTransitions from "./actions/request-get-transitions.ts";
import requestTransition from "./actions/request-transition.ts";

import commentAdd from "./actions/comment-add.ts";
import commentGetMany from "./actions/comment-get-many.ts";

import participantAdd from "./actions/participant-add.ts";
import participantGetMany from "./actions/participant-get-many.ts";

import slaGetMany from "./actions/sla-get-many.ts";

import organizationGetMany from "./actions/organization-get-many.ts";

import queueGetMany from "./actions/queue-get-many.ts";
import queueGetIssues from "./actions/queue-get-issues.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    // service desk
    servicedeskGetMany,
    servicedeskGet,
    // request type
    requesttypeGetMany,
    // customer request
    requestCreate,
    requestGet,
    requestSearch,
    requestGetStatus,
    requestGetTransitions,
    requestTransition,
    // comment
    commentAdd,
    commentGetMany,
    // participant
    participantAdd,
    participantGetMany,
    // sla
    slaGetMany,
    // organization
    organizationGetMany,
    // queue
    queueGetMany,
    queueGetIssues,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;

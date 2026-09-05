/**
 * Jira Data Center / Server — the self-hosted classic REST API, a genuinely
 * different product from the sibling `jira` app in this pack (Jira **Cloud**
 * only, scoped to `*.atlassian.net` / `api.atlassian.com`).
 *
 * Every path, request/response field and auth method was verified against
 * the vendor's own reference: `developer.atlassian.com/server/jira/platform/rest-apis/`
 * (fetched 2026-09-05, redirects to the current version's OpenAPI document,
 * "Jira Software Data Center REST API Reference") and
 * `confluence.atlassian.com/enterprise/using-personal-access-tokens…` for the
 * PAT header shape. See each action's and auth file's header for the
 * specific fact it backs.
 *
 * ## There is no vendor host
 *
 * Data Center and Server are self-hosted: every customer runs it on their
 * own domain. So the instance URL is a connection field, the same posture
 * this pack already uses for `gitea`, `mautic` and Tableau Server, and
 * `w6w.network.allow` is `["*"]`.
 *
 * ## `/rest/api/2`, not `/rest/api/3`
 *
 * The reference's own "URI Structure" section states the `api` name's
 * "Current version is `2`" — Data Center has never shipped a v3. That is
 * also why `description` and comment bodies here are plain strings (wiki
 * markup), not the Atlassian Document Format objects Cloud's v3 requires.
 *
 * ## Users are identified by username, not `accountId`
 *
 * Jira Cloud replaced username/email lookups with an opaque `accountId`.
 * Data Center never made that change — `assignee`, `reporter`, `/user/search`
 * and `/user` all key off the login **username** (`UserJsonBean.name`), which
 * is why every action here asks for a username rather than an account id.
 *
 * ## Deliberately absent
 *
 *   - **OAuth 2.0.** Documented as Atlassian's other "Recommended" method,
 *     but it requires registering an application link in the target
 *     instance's own admin console first — a per-instance setup step outside
 *     what a portable App package can drive. Personal Access Token covers the
 *     same "recommended, not Basic" posture with zero instance-side setup.
 *   - **OAuth 1.0a.** The vendor's own docs mark this "deprecated".
 *   - **Attachments** (multipart upload — the sandbox's `ctx.fetch` is not a
 *     fit) and the **webhook trigger**, same reasons as the sibling `jira`
 *     Cloud app.
 *   - **Boards/sprints (the `agile/1.0` API), issue links, worklogs, watchers,
 *     votes and every admin-only surface** (issue types, workflow schemes,
 *     permission schemes, user anonymisation) — a big surface this version
 *     does not attempt; see README.md for the reasoning.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import basic from "./auth/basic.ts";

import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueUpdate from "./actions/issue-update.ts";
import issueDelete from "./actions/issue-delete.ts";
import issueSearch from "./actions/issue-search.ts";
import issueTransition from "./actions/issue-transition.ts";
import issueGetTransitions from "./actions/issue-get-transitions.ts";
import issueAssign from "./actions/issue-assign.ts";

import commentAdd from "./actions/comment-add.ts";
import commentGetMany from "./actions/comment-get-many.ts";
import commentDelete from "./actions/comment-delete.ts";

import userSearch from "./actions/user-search.ts";
import userGet from "./actions/user-get.ts";

import projectGetMany from "./actions/project-get-many.ts";
import projectGet from "./actions/project-get.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // issue
    issueCreate,
    issueGet,
    issueUpdate,
    issueDelete,
    issueSearch,
    issueTransition,
    issueGetTransitions,
    issueAssign,
    // comment
    commentAdd,
    commentGetMany,
    commentDelete,
    // user
    userSearch,
    userGet,
    // project
    projectGetMany,
    projectGet,
  ],
  auth: [personalAccessToken, basic],
  healthChecks: [instance, service, quota],
} satisfies AppDefinition;

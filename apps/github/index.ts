/**
 * GitHub — w6w port of n8n's `Github` node (REST API 2022-11-28).
 *
 * Covers the issue, repository, release, file, pull request, workflow, user and
 * organization resources. Three things from the n8n node are deliberately
 * absent:
 *
 *   - **GitHub Enterprise Server.** n8n's credential takes a `server` URL. The
 *     egress allowlist in `package.json` is static, so an arbitrary Enterprise
 *     host would be denied by the runtime; publish a variant declaring that
 *     host instead.
 *   - **GitHub App (installation) auth.** It needs a JWT signed with the app's
 *     RSA private key, which means crypto over a stored key inside `sign` —
 *     out of scope for this port. Use a PAT or OAuth.
 *   - **the repository webhook trigger.** That is a Trigger, not an Action;
 *     port it against `rfcs/trigger.md` when this pack takes on triggers.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueUpdate from "./actions/issue-update.ts";
import issueComment from "./actions/issue-comment.ts";
import issueLock from "./actions/issue-lock.ts";
import repositoryGet from "./actions/repository-get.ts";
import repositoryGetIssues from "./actions/repository-get-issues.ts";
import repositoryGetLicense from "./actions/repository-get-license.ts";
import refGet from "./actions/ref-get.ts";
import releaseCreate from "./actions/release-create.ts";
import releaseGetMany from "./actions/release-get-many.ts";
import releaseUpdate from "./actions/release-update.ts";
import releaseDelete from "./actions/release-delete.ts";
import fileGet from "./actions/file-get.ts";
import fileCreateOrUpdate from "./actions/file-create-or-update.ts";
import fileDelete from "./actions/file-delete.ts";
import pullRequestGet from "./actions/pull-request-get.ts";
import pullRequestGetMany from "./actions/pull-request-get-many.ts";
import pullRequestMerge from "./actions/pull-request-merge.ts";
import pullRequestCreateReview from "./actions/pull-request-create-review.ts";
import workflowDispatch from "./actions/workflow-dispatch.ts";
import workflowGetMany from "./actions/workflow-get-many.ts";
import workflowEnable from "./actions/workflow-enable.ts";
import userGetRepositories from "./actions/user-get-repositories.ts";
import organizationGetRepositories from "./actions/organization-get-repositories.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // issue
    issueCreate,
    issueGet,
    issueUpdate,
    issueComment,
    issueLock,
    // repository
    repositoryGet,
    repositoryGetIssues,
    repositoryGetLicense,
    refGet,
    // release
    releaseCreate,
    releaseGetMany,
    releaseUpdate,
    releaseDelete,
    // file
    fileGet,
    fileCreateOrUpdate,
    fileDelete,
    // pull request
    pullRequestGet,
    pullRequestGetMany,
    pullRequestMerge,
    pullRequestCreateReview,
    // workflow
    workflowDispatch,
    workflowGetMany,
    workflowEnable,
    // user / organization
    userGetRepositories,
    organizationGetRepositories,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
  interfaces: [{
    interfaceId: "blob-store@1",
    methods: {
      headRef: {
        uses: { action: "ref-get" },
        outputMap: { sha: { "$": "output.object.sha" } },
      },
      list: {
        uses: { action: "file-get" },
        with: {
          owner: { "$": "inputs.owner" },
          repository: { "$": "inputs.repository" },
          filePath: { "$": "inputs.path" },
          ref: { "$": "inputs.ref" },
        },
      },
      get: {
        uses: { action: "file-get" },
        with: {
          owner: { "$": "inputs.owner" },
          repository: { "$": "inputs.repository" },
          filePath: { "$": "inputs.path" },
          ref: { "$": "inputs.ref" },
        },
      },
      put: {
        uses: { action: "file-create-or-update" },
        with: {
          owner: { "$": "inputs.owner" },
          repository: { "$": "inputs.repository" },
          filePath: { "$": "inputs.path" },
          content: { "$": "inputs.content" },
          sha: { "$": "inputs.expectedSha" },
          commitMessage: "w6w interface sync", // D-11: a LITERAL
        },
        outputMap: { sha: { "$": "output.content.sha" } },
      },
      delete: {
        uses: { action: "file-delete" },
        with: {
          owner: { "$": "inputs.owner" },
          repository: { "$": "inputs.repository" },
          filePath: { "$": "inputs.path" },
          sha: { "$": "inputs.expectedSha" },
          commitMessage: "w6w interface sync",
        },
        outputMap: { ok: true },
      },
    },
  }],
} satisfies AppDefinition;

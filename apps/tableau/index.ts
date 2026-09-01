/**
 * Tableau — sites, projects, workbooks, views and data sources, on either
 * Tableau Cloud or a self-hosted Tableau Server.
 *
 * Every path, request/response field and permission note was taken from the
 * vendor's own REST API reference (help.tableau.com/current/api/rest_api,
 * fetched 2026-09-01) — see each action's and auth file's header for the
 * specific page it was verified against.
 *
 * ## There is no vendor host
 *
 * Tableau Cloud is pod-hosted (`10ax.online.tableau.com`,
 * `us-east-1.online.tableau.com`, …) and Tableau Server is whatever address a
 * customer gave their own install. So the server address is a connection
 * field — the posture this pack already uses for `gitea` and `mautic` — and
 * `w6w.network.allow` is `["*"]`.
 *
 * ## A Personal Access Token is not a bearer credential here
 *
 * It has to be traded for a session (`POST /auth/signin`) before it
 * authenticates anything, and that session expires (240 min on Server, 120
 * on Cloud). `auth/personal-access-token.ts` stores both halves and re-signs
 * in on `refresh` — see that file's header for the full flow.
 *
 * ## Three things that go wrong quietly
 *
 *   - **XML is the default; JSON is opt-in.** Every request here sends
 *     `Accept: application/json`, or the response would be XML the JSON
 *     parsing in this app cannot read.
 *   - **A list of exactly one item is not an array.** `{ datasources: {
 *     datasource: {...} } }` and `{ datasources: { datasource: [{...},
 *     {...}] } }` are both real shapes for the same endpoint, depending only
 *     on how many rows came back. `unwrapList` in `lib/client.ts` normalizes
 *     this once instead of every list action re-discovering it.
 *   - **A session is scoped to one site.** Sending it to a different site's
 *     endpoint answers 403, not a redirect — which is why every action reads
 *     the connection's own `siteId` rather than taking one as a parameter.
 *
 * ## Deliberately out of scope
 *
 *   - **Publishing new workbooks or data sources.** Tableau's publish
 *     endpoints are multipart uploads with their own chunking rules for large
 *     files — a big enough surface to earn its own app version rather than a
 *     partial implementation here.
 *   - **Users, groups, schedules and permissions management.** `user-list`
 *     and `user-get` are read-only; creating/removing users, group
 *     membership, content permissions and extract-refresh schedules are all
 *     admin surfaces this version does not touch.
 *   - **The Metadata API (GraphQL).** A separate API surface from the REST
 *     API this app implements.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";

import siteGet from "./actions/site-get.ts";
import projectList from "./actions/project-list.ts";
import projectCreate from "./actions/project-create.ts";
import projectDelete from "./actions/project-delete.ts";
import workbookList from "./actions/workbook-list.ts";
import workbookGet from "./actions/workbook-get.ts";
import workbookDelete from "./actions/workbook-delete.ts";
import viewListForSite from "./actions/view-list-for-site.ts";
import viewListForWorkbook from "./actions/view-list-for-workbook.ts";
import viewImageGet from "./actions/view-image-get.ts";
import datasourceList from "./actions/datasource-list.ts";
import datasourceGet from "./actions/datasource-get.ts";
import datasourceRefresh from "./actions/datasource-refresh.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // site
    siteGet,
    // projects
    projectList,
    projectCreate,
    projectDelete,
    // workbooks
    workbookList,
    workbookGet,
    workbookDelete,
    // views
    viewListForSite,
    viewListForWorkbook,
    viewImageGet,
    // data sources
    datasourceList,
    datasourceGet,
    datasourceRefresh,
    // users
    userList,
    userGet,
  ],
  auth: [personalAccessToken],
  healthChecks: [instance, service],
} satisfies AppDefinition;

/**
 * Basecamp — projects, people, to-dos, messages, comments and Campfire lines on
 * the **Basecamp 5 API** (`3.basecampapi.com/{accountId}/…`).
 *
 * Every path, verb and body field was verified on 2026-08-11 against Basecamp's
 * own sources: the REST reference at `basecamp/bc3-api` (plain Markdown on
 * GitHub) and the official OpenAPI document the vendor ships with its SDK
 * (`basecamp/basecamp-sdk`, `openapi.json`, OpenAPI 3.1.0, "Basecamp
 * 2026-08-05", 167 paths). Nothing here came from a third-party integration
 * directory.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The account id is in every URL, and is discovered rather than typed**
 *     (`auth/oauth.ts`). One 37signals ID can reach several accounts and several
 *     *products*; only those with `product: "bc3"` speak this API, so a HEY-only
 *     identity is reported as unusable instead of producing a Connection that
 *     404s on everything.
 *  2. **Basecamp requires a `User-Agent` naming the app and a contact address**
 *     (`lib/client.ts`). It is a documented requirement, not a nicety, and it
 *     rides on the unsigned health checks too.
 *  3. **Everything is a "recording"** (`actions/comment-create.ts`), so one
 *     endpoint comments on messages, to-dos, documents and uploads alike — one
 *     action instead of four.
 *  4. **A message is a draft unless you say otherwise**
 *     (`actions/message-create.ts`). Basecamp's own default publishes nothing and
 *     notifies nobody; this app defaults to `active` and offers the draft
 *     explicitly.
 *  5. **Three plausible status subdomains are unclaimed shells**
 *     (`health/service.ts`). `basecamp.`, `basecamphq.` and `bc3.statuspage.io`
 *     each answer 200 with the same 127,697-byte marketing page. The real one is
 *     37signals', and the verdict is taken from its `Basecamp 5` component
 *     rather than from a page that also covers HEY and Highrise.
 *
 * Flat routes are used throughout — `GET /todos/{id}.json` rather than the
 * legacy `/buckets/{project_id}/…` form the vendor still supports.
 */
import type { AppDefinition } from "@w6w/types";
import oauth from "./auth/oauth.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import peopleList from "./actions/people-list.ts";

import todoList from "./actions/todo-list.ts";
import todoGet from "./actions/todo-get.ts";
import todoCreate from "./actions/todo-create.ts";
import todoComplete from "./actions/todo-complete.ts";

import messageList from "./actions/message-list.ts";
import messageCreate from "./actions/message-create.ts";
import commentCreate from "./actions/comment-create.ts";
import campfireLineCreate from "./actions/campfire-line-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // projects and people — where every other id comes from, via a project's dock
    projectList,
    projectGet,
    peopleList,
    // to-dos
    todoList,
    todoGet,
    todoCreate,
    todoComplete,
    // messages, comments and chat
    messageList,
    messageCreate,
    commentCreate,
    campfireLineCreate,
  ],
  // OAuth only — Basecamp has no API keys or personal access tokens. The host
  // runs the flow and holds the refresh token, so `sign` only stamps a bearer;
  // see auth/oauth.ts for why that is not the pattern rejected elsewhere here.
  auth: [oauth],
  healthChecks: [service, quota],
} satisfies AppDefinition;

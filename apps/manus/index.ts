/**
 * Manus — a general-purpose AI agent platform: it browses, writes code,
 * builds and publishes websites, and works through multi-step tasks the way
 * a person would. This app drives Manus's API **v2** (`api.manus.ai`).
 *
 * Every path, verb, query parameter and body field in this app was read
 * directly out of the machine-readable OpenAPI document Manus's own docs
 * publish (`open.manus.ai/docs/v2/openapi_v2.json`), cross-checked against
 * the human-readable guide pages (Mintlify-hosted; every page also answers
 * as clean markdown at its own `.md` suffix — `open.manus.ai/docs/v2/task
 * .create.md` — a trick that turns a rendered HTML shell into a page this
 * app's author could actually read cleanly), plus live probes against
 * `api.manus.ai`, all on 2026-09-05. Nothing here came from a third-party
 * integration directory.
 *
 * ## v1 is explicitly deprecated — this app is built entirely against v2
 *
 * `open.manus.ai/docs/llms.txt` lists a full parallel v1 surface
 * (`v1/create-task`, `v1/get-task`, an OpenAI-SDK-compatibility shim, …)
 * alongside v2. The v1 overview page states outright:
 *
 * > You are viewing API v2 — the latest version... API v1 has been
 * > deprecated and will be removed in the future.
 *
 * No v1 endpoint is implemented, referenced, or called anywhere in this
 * package, even though it is real and still reachable on the wire.
 *
 * ## API key over OAuth2
 *
 * Manus documents two auth methods for v2: the `x-manus-api-key` header
 * this app uses, and an `Authorization: Bearer <token>` OAuth2 flow for
 * third-party "Open Apps" acting on behalf of a *different* team's users
 * (Team-account-only, its own consent screen and scopes). This app models
 * unattended access to one's own account — exactly the case the docs
 * recommend the API-key header for — so only that method is implemented;
 * see `auth/api-key.ts`.
 *
 * ## A near-complete surface, on purpose
 *
 * Manus's v2 API is small (32 endpoints total) and entirely
 * workflow-relevant — unlike some vendors, there is no separate
 * enterprise-admin surface to deliberately leave out. Every documented
 * endpoint has an Action here: the task lifecycle (create, poll, message,
 * confirm, stop, delete, update, list); projects; skills; custom agents;
 * files; webhooks; online browser clients (for the human-in-the-loop
 * browser-handoff flow); usage/credit accounting; connectors; and the
 * websites a task can build and publish.
 *
 * One deliberate simplification throughout: `Message.content` supports an
 * arbitrary `ContentPart[]` (text, file, or voice, each providable by id,
 * URL, or inline base64 data) — this app's `content` + optional single
 * file-attachment params (see `lib/client.ts#buildContent`) cover the common
 * case a workflow step can actually compose from form fields, not every
 * combination the schema allows.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import taskCreate from "./actions/task-create.ts";
import taskDetail from "./actions/task-detail.ts";
import taskList from "./actions/task-list.ts";
import taskUpdate from "./actions/task-update.ts";
import taskStop from "./actions/task-stop.ts";
import taskDelete from "./actions/task-delete.ts";
import taskSendMessage from "./actions/task-send-message.ts";
import taskListMessages from "./actions/task-list-messages.ts";
import taskConfirmAction from "./actions/task-confirm-action.ts";

import projectCreate from "./actions/project-create.ts";
import projectList from "./actions/project-list.ts";

import skillList from "./actions/skill-list.ts";

import agentList from "./actions/agent-list.ts";
import agentDetail from "./actions/agent-detail.ts";
import agentUpdate from "./actions/agent-update.ts";

import fileUpload from "./actions/file-upload.ts";
import fileDetail from "./actions/file-detail.ts";
import fileDelete from "./actions/file-delete.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookPublicKey from "./actions/webhook-public-key.ts";

import browserOnlineList from "./actions/browser-online-list.ts";

import usageList from "./actions/usage-list.ts";
import usageTeamStatistic from "./actions/usage-team-statistic.ts";
import usageTeamLog from "./actions/usage-team-log.ts";
import usageAvailableCredits from "./actions/usage-available-credits.ts";

import connectorList from "./actions/connector-list.ts";

import websiteStatus from "./actions/website-status.ts";
import websiteListCheckpoints from "./actions/website-list-checkpoints.ts";
import websitePublish from "./actions/website-publish.ts";
import websiteUpdate from "./actions/website-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Tasks
    taskCreate,
    taskDetail,
    taskList,
    taskUpdate,
    taskStop,
    taskDelete,
    taskSendMessage,
    taskListMessages,
    taskConfirmAction,
    // Projects
    projectCreate,
    projectList,
    // Skills
    skillList,
    // Agents
    agentList,
    agentDetail,
    agentUpdate,
    // Files
    fileUpload,
    fileDetail,
    fileDelete,
    // Webhooks
    webhookCreate,
    webhookList,
    webhookDelete,
    webhookPublicKey,
    // Browser
    browserOnlineList,
    // Usage
    usageList,
    usageTeamStatistic,
    usageTeamLog,
    usageAvailableCredits,
    // Connectors
    connectorList,
    // Website
    websiteStatus,
    websiteListCheckpoints,
    websitePublish,
    websiteUpdate,
  ],
  // API key only. Manus also publishes an OAuth2 flow for third-party "Open
  // Apps" acting on behalf of a different team's users — a distinct use case
  // this app does not implement; see the module docblock above.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

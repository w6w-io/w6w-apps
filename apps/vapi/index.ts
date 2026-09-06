/**
 * Vapi — voice-AI infrastructure: place and manage phone/web calls against an
 * Assistant, Squad or Workflow, and read the catalogs behind them, over the
 * Vapi API (`api.vapi.ai`).
 *
 * Every path, verb, query parameter, request/response field and error shape
 * in this app was verified on 2026-09-06 against Vapi's own live OpenAPI
 * document (`https://api.vapi.ai/api-json`, 2,111,869 bytes, `info.version`
 * `"1.0"`) plus live probes against `api.vapi.ai` and `status.vapi.ai`.
 * Nothing here came from a third-party integration directory.
 *
 * Findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Two keys, and the vendor's own 401 names the mistake** (`auth/private-key.ts`).
 *     A Vapi project has a private (server) key and a public (client-SDK) key;
 *     presenting the public one to this API answers with a body that says so
 *     outright rather than a bare 401.
 *  2. **Two incompatible pagination shapes on one host** (`lib/client.ts`,
 *     `actions/phone-number-list.ts`). Every list endpoint here except phone
 *     numbers answers a bare array, paginated only by `createdAt`/`updatedAt`
 *     range filters — no offset, no cursor. `GET /v2/phone-number` alone
 *     answers `{results, metadata}` and paginates by `page` number.
 *  3. **`GET /file` requires `purpose`** (`actions/file-list.ts`) — the one
 *     list endpoint in the whole surface with a REQUIRED filter and no
 *     `limit`/date filtering at all. Every other list here treats every
 *     filter as optional.
 *  4. **No account/usage endpoint of any kind** (`health/quota.ts`) — nothing
 *     to read for spend, concurrency or a rate-limit header; quota is a
 *     declared absence, not a guess.
 *  5. **`DELETE /call/{id}` erases DATA, it does not hang up** (`actions/call-delete.ts`),
 *     and `PATCH /call/{id}` (`actions/call-update.ts`) can only rename a
 *     call — there is no REST endpoint to end a live call.
 *
 * This app deliberately does NOT create or update Assistants, Squads or
 * Tools: each request body is a deeply nested, polymorphic configuration
 * object (transcriber + model + voice + compliance plan for an Assistant;
 * one of twelve unrelated shapes for a Tool) meant to be authored once in the
 * Vapi dashboard and referenced by id from a workflow, not re-typed into a
 * generated form — the same scoping call this pack's `retellai` app made for
 * its own Agent object.
 */
import type { AppDefinition } from "@w6w/types";
import privateKey from "./auth/private-key.ts";

import assistantList from "./actions/assistant-list.ts";
import assistantGet from "./actions/assistant-get.ts";
import assistantDelete from "./actions/assistant-delete.ts";

import callCreate from "./actions/call-create.ts";
import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callUpdate from "./actions/call-update.ts";
import callDelete from "./actions/call-delete.ts";

import phoneNumberList from "./actions/phone-number-list.ts";
import phoneNumberGet from "./actions/phone-number-get.ts";

import squadList from "./actions/squad-list.ts";
import squadGet from "./actions/squad-get.ts";

import toolList from "./actions/tool-list.ts";
import toolGet from "./actions/tool-get.ts";

import fileList from "./actions/file-list.ts";
import fileGet from "./actions/file-get.ts";
import fileCreate from "./actions/file-create.ts";
import fileDelete from "./actions/file-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Assistants
    assistantList,
    assistantGet,
    assistantDelete,
    // Calls
    callCreate,
    callList,
    callGet,
    callUpdate,
    callDelete,
    // Phone numbers
    phoneNumberList,
    phoneNumberGet,
    // Squads
    squadList,
    squadGet,
    // Tools
    toolList,
    toolGet,
    // Files
    fileList,
    fileGet,
    fileCreate,
    fileDelete,
  ],
  // Private Key only. Vapi's Public Key is scoped for the client-side SDK and
  // is rejected by most of this surface — see auth/private-key.ts.
  auth: [privateKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

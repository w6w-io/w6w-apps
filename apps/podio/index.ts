/**
 * Podio — the collaborative work platform whose records are defined by the
 * people using it: an organization holds workspaces, a workspace holds *apps*,
 * an app is a user-defined record type, and its items are the records.
 *
 * Every path, verb, query parameter, body field and enum in this package was
 * verified on 2026-08-11 against three primary sources, in this order of
 * authority where they disagree:
 *
 *  1. **Live probes** of `api.podio.com` and `status.podio.com`.
 *  2. **Podio's own client**, `github.com/podio/podio-php`,
 *     `lib/PodioClient.php`, `VERSION = '7.0.0'` — executable, and therefore
 *     right about the wire where the prose is not.
 *  3. **The reference** at `developers.podio.com/doc` — a 19,167-byte index
 *     linking one page per resource area, followed to each operation used here.
 *
 * Nothing came from a third-party integration directory.
 *
 * ## The four findings that shaped this package
 *
 *  1. **Two token endpoints, mirror-imaged** (`auth/app-auth.ts`).
 *     `/oauth/token/v2` accepts a JSON body **only**; the legacy `/oauth/token`
 *     accepts form-encoded **only**. Each rejects the other's encoding with an
 *     error that reads like bad credentials rather than a wrong content type —
 *     `"Invalid value null (null): must be object"` and
 *     `"Missing parameter client_id"`. The documentation shows only the first;
 *     the vendor's client uses only the second. All four combinations are
 *     measured in that file. This app uses `/oauth/token`, because form-encoded
 *     is what RFC 6749 specifies and therefore what the host's generic OAuth
 *     exchange will send.
 *  2. **The scheme is `OAuth2`, not `Bearer`** (`auth/app-auth.ts`), even
 *     though the token response says `"token_type": "bearer"` and a 401 comes
 *     back with `WWW-Authenticate: Bearer realm="podio"`. Both are accepted
 *     today; the documented one is the one with a promise behind it.
 *  3. **`GET /app/{app_id}` returns a live credential** (`lib/client.ts`,
 *     `actions/app-get.ts`). Its documented response includes `token`, "The app
 *     token to use when logging in as an app" — the credential half of the App
 *     Authentication grant. It is deleted before any action returns, along with
 *     the `push` channel signature on items, tasks and files.
 *  4. **A 401 does not tell you what went wrong** (`lib/client.ts`
 *     `classifyAuthFailure`). Podio answers 401 both for "no credential
 *     arrived" and "credential rejected", and only `error_description`
 *     separates them — `invalid_request` versus `expired_token`. Worse,
 *     `expired_token` is what a *never-valid* and a *revoked* token both
 *     report, which is why the vendor's own client's refresh-and-retry loop can
 *     spin forever and why this app never treats it as "just refresh".
 *
 * ## The design problem: items have no schema this package can know
 *
 * A Podio app's fields are defined at runtime by whoever built the app, so
 * nothing here can render them as form controls or flatten their values without
 * losing data. `fields` is therefore a `json` parameter carrying Podio's own
 * documented structure on write, and item reads return Podio's own
 * array-of-field-descriptors verbatim. `app-fields-list` exists to make that
 * workable: it turns `GET /app/{app_id}` into the schema, the sub_id vocabulary
 * per field type, and the category option ids. `README.md` states what this
 * costs, in full, rather than burying it.
 *
 * ## Two authentication methods, deliberately
 *
 * `app-auth` is the primary: no browser, works in scheduled runs, locked to one
 * app. `oauth2` is the browser flow: acts as a person, reaches everything they
 * can, needs an API key registered on this installation. Podio's **username and
 * password** grant is documented and is deliberately not offered — it is a
 * resource-owner-password flow, the pattern OAuth 2.1 removes, and it would
 * mean storing a person's actual Podio password in a Connection where an app
 * token that can be scoped and regenerated already exists.
 *
 * ## App Authentication reaches only part of this surface, and Podio says which
 *
 * Podio's reference marks each operation that works under an app token with a
 * "Can be used with App Authentication" badge. Of the operations this package
 * implements, the badge is present on: get/create/update/delete item, get item
 * values, get item by external id, count items, get app, add and list comments,
 * create task with reference, complete task, search in app, create and list
 * webhooks, request webhook verification, get and attach file, and get scope.
 * It is **absent** on: list organizations, list workspaces, get workspace, list
 * apps, filter items, search in workspace, list/get/create task without a
 * reference, and delete webhook. Those need an OAuth connection. This is the
 * vendor's own marking, transcribed rather than inferred — and its oddities
 * (create-hook badged, delete-hook not) are Podio's, not a transcription error.
 *
 * ## What is deliberately absent
 *
 *  - **File upload.** `POST /file/v2/` is `multipart/form-data` carrying file
 *    bytes. An Action's input is a JSON document and its result is persisted in
 *    the run record, so there is no honest way to move an arbitrary binary
 *    through one. `file-attach` handles ids that already exist.
 *  - **Validate webhook verification** (`POST /hook/{id}/verify/validate`). It
 *    needs a code that Podio delivers to *the hook's own endpoint* and that
 *    nothing in a workflow can see. An action for it would be a form field
 *    nobody can fill in.
 *  - **The `/v2`-suffixed item and search variants.** They exist
 *    (`/item/{id}/value/v2`, `/search/v2`) but carry no App Authentication
 *    badge where their v1 siblings do, and the reference does not document what
 *    differs. Shipping an endpoint whose contract cannot be read would be a
 *    guess.
 *  - **Everything the reference lists but this package does not reach** — the
 *    Flows, Importer, Integrations, Grants, Widgets, Layout and Recurrence
 *    areas among them. Each is a genuine surface; none was verified for this
 *    build, and an unverified action is worse than a missing one.
 */
import type { AppDefinition } from "@w6w/types";

import appAuth from "./auth/app-auth.ts";
import oauth2 from "./auth/oauth2.ts";

import orgList from "./actions/org-list.ts";
import spaceList from "./actions/space-list.ts";
import spaceGet from "./actions/space-get.ts";

import appList from "./actions/app-list.ts";
import appGet from "./actions/app-get.ts";
import appFieldsList from "./actions/app-fields-list.ts";

import itemGet from "./actions/item-get.ts";
import itemValuesGet from "./actions/item-values-get.ts";
import itemGetByExternalId from "./actions/item-get-by-external-id.ts";
import itemCount from "./actions/item-count.ts";
import itemFilter from "./actions/item-filter.ts";
import itemCreate from "./actions/item-create.ts";
import itemUpdate from "./actions/item-update.ts";
import itemDelete from "./actions/item-delete.ts";

import searchApp from "./actions/search-app.ts";
import searchSpace from "./actions/search-space.ts";

import commentList from "./actions/comment-list.ts";
import commentAdd from "./actions/comment-add.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskComplete from "./actions/task-complete.ts";

import hookList from "./actions/hook-list.ts";
import hookCreate from "./actions/hook-create.ts";
import hookVerifyRequest from "./actions/hook-verify-request.ts";
import hookDelete from "./actions/hook-delete.ts";

import fileGet from "./actions/file-get.ts";
import fileAttach from "./actions/file-attach.ts";

import scopeGet from "./actions/scope-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Organizations and workspaces
    orgList,
    spaceList,
    spaceGet,
    // Apps — the user-defined record types
    appList,
    appGet,
    appFieldsList,
    // Items
    itemGet,
    itemValuesGet,
    itemGetByExternalId,
    itemCount,
    itemFilter,
    itemCreate,
    itemUpdate,
    itemDelete,
    // Search — the only text-capable read
    searchApp,
    searchSpace,
    // Comments
    commentList,
    commentAdd,
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskComplete,
    // Webhooks
    hookList,
    hookCreate,
    hookVerifyRequest,
    hookDelete,
    // Files
    fileGet,
    fileAttach,
    // The grant itself
    scopeGet,
  ],
  auth: [appAuth, oauth2],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;

/**
 * Raindrop.io — the bookmark manager: collections, raindrops (bookmarks),
 * highlights and tags, over the Raindrop REST API v1
 * (`api.raindrop.io/rest/v1`).
 *
 * Every path, verb, body field and enum in this app was verified on 2026-08-11
 * against Raindrop's own reference at `developer.raindrop.io` — whose GitBook
 * serves a Markdown projection of every page (append `.md`; the index is
 * `llms.txt`) — plus live probes against `api.raindrop.io`, `raindrop.io/oauth/*`
 * and `status.raindrop.io`. Nothing here came from a third-party integration
 * directory.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **HTTP 200 does not mean success, and 401 does not mean "bad token"**
 *     (`lib/client.ts`, `auth/probe.ts`, `auth/oauth2.ts`). The OAuth token
 *     endpoint answers `200` carrying
 *     `{"result": false, "status": 400, "errorMessage": "client_id or
 *     client_secret is invalid"}` — measured — so a failed exchange looks
 *     successful to anything reading `res.ok`. Meanwhile the REST API returns
 *     the *same* 401 status for two different problems, distinguished only in
 *     the body: `"Unauthorized"` (no credential arrived) vs
 *     `"Incorrect access_token"` (credential rejected). Every verdict in this app
 *     is read from the body.
 *  2. **An unauthenticated probe cannot tell a real path from a typo**
 *     (`lib/client.ts`). Authentication runs before routing:
 *     `GET /rest/v1/nonexistent-zzz` and `GET /rest/v1/user` return
 *     byte-identical 72-byte 401s. Combined with the API's pervasive
 *     singular/plural split — `/collection/{id}` vs `/collections`,
 *     `/raindrop/{id}` vs `/raindrops/{collectionId}`, `/backup` vs `/backups`,
 *     each pair being *different endpoints* rather than aliases — that makes the
 *     reference the only source of truth for a path.
 *  3. **`result: false` is sometimes the correct answer** (`actions/url-exists.ts`,
 *     `actions/url-parse.ts`). `POST /import/url/exists` reports "none of these
 *     URLs is saved" as `{"result": false, "ids": []}`, and
 *     `GET /import/url/parse` reports an unreachable page as `result: true` *with*
 *     an `error` field. Both opt out of the shared envelope check and say so at
 *     the call site.
 *  4. **The status page looks unclaimed and is not** (`health/service.ts`).
 *     `status.raindrop.io` answers every path — including `/api/v2/status.json`,
 *     `/api/v2/summary.json` and a nonsense path — with the same 511,148-byte
 *     HTML, which is the classic parked-host signature. It is a real, claimed
 *     **Better Stack** page: `/index.json` is 43,414 bytes of JSON naming
 *     `"company_name": "Raindrop.io"` and five components, one of which is `API`.
 *  5. **The same field name means different operations on different paths**
 *     (`actions/raindrop-update.ts` vs `actions/raindrop-update-many.ts`, and the
 *     three highlight actions). `tags` **replaces** on `PUT /raindrop/{id}` and
 *     **appends** on `PUT /raindrops/{collectionId}`, where `[]` is a third
 *     meaning again — erase. And deleting a highlight is a `PUT` on its parent
 *     bookmark whose element carries an empty `text`, so an edit form that let a
 *     user clear that box would destroy the record.
 *
 * Two auth methods, both real: a permanent **test token** (does not expire, acts
 * as the account owning the app registration) and full **OAuth2** (any account,
 * two-week tokens, host-refreshed). What is deliberately absent — file uploads,
 * export/backup downloads, the permanent-copy redirect, `PUT /user`, the
 * expand-all variant and the `reminder` field — is listed with reasons in the
 * README.
 */
import type { AppDefinition } from "@w6w/types";

import testToken from "./auth/test-token.ts";
import oauth2 from "./auth/oauth2.ts";

// Collections
import collectionList from "./actions/collection-list.ts";
import collectionChildrenList from "./actions/collection-children-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionCreate from "./actions/collection-create.ts";
import collectionUpdate from "./actions/collection-update.ts";
import collectionDelete from "./actions/collection-delete.ts";
import collectionDeleteMany from "./actions/collection-delete-many.ts";
import collectionMerge from "./actions/collection-merge.ts";
import collectionReorder from "./actions/collection-reorder.ts";
import collectionCleanEmpty from "./actions/collection-clean-empty.ts";
import coverSearch from "./actions/cover-search.ts";

// Sharing
import collectionSharingList from "./actions/collection-sharing-list.ts";
import collectionShare from "./actions/collection-share.ts";
import collectionUnshare from "./actions/collection-unshare.ts";
import collaboratorRoleUpdate from "./actions/collaborator-role-update.ts";
import collaboratorRemove from "./actions/collaborator-remove.ts";

// Raindrops
import raindropGet from "./actions/raindrop-get.ts";
import raindropSearch from "./actions/raindrop-search.ts";
import raindropCreate from "./actions/raindrop-create.ts";
import raindropCreateMany from "./actions/raindrop-create-many.ts";
import raindropUpdate from "./actions/raindrop-update.ts";
import raindropUpdateMany from "./actions/raindrop-update-many.ts";
import raindropDelete from "./actions/raindrop-delete.ts";
import raindropDeleteMany from "./actions/raindrop-delete-many.ts";
import raindropSuggest from "./actions/raindrop-suggest.ts";

// Highlights
import highlightList from "./actions/highlight-list.ts";
import highlightAdd from "./actions/highlight-add.ts";
import highlightUpdate from "./actions/highlight-update.ts";
import highlightRemove from "./actions/highlight-remove.ts";

// Tags
import tagList from "./actions/tag-list.ts";
import tagRename from "./actions/tag-rename.ts";
import tagRemove from "./actions/tag-remove.ts";

// Account, insight and import
import userGet from "./actions/user-get.ts";
import userStatsGet from "./actions/user-stats-get.ts";
import filterList from "./actions/filter-list.ts";
import urlParse from "./actions/url-parse.ts";
import urlExists from "./actions/url-exists.ts";
import backupList from "./actions/backup-list.ts";
import backupCreate from "./actions/backup-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Collections
    collectionList,
    collectionChildrenList,
    collectionGet,
    collectionCreate,
    collectionUpdate,
    collectionDelete,
    collectionDeleteMany,
    collectionMerge,
    collectionReorder,
    collectionCleanEmpty,
    coverSearch,
    // Sharing
    collectionSharingList,
    collectionShare,
    collectionUnshare,
    collaboratorRoleUpdate,
    collaboratorRemove,
    // Raindrops
    raindropGet,
    raindropSearch,
    raindropCreate,
    raindropCreateMany,
    raindropUpdate,
    raindropUpdateMany,
    raindropDelete,
    raindropDeleteMany,
    raindropSuggest,
    // Highlights
    highlightList,
    highlightAdd,
    highlightUpdate,
    highlightRemove,
    // Tags
    tagList,
    tagRename,
    tagRemove,
    // Account, insight and import
    userGet,
    userStatsGet,
    filterList,
    urlParse,
    urlExists,
    backupList,
    backupCreate,
  ],
  // Test token first: it is the one most connections will use, needs no app
  // registration on the w6w side, and never expires. OAuth is what a multi-user
  // installation needs.
  auth: [testToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

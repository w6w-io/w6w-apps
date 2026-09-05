/**
 * Guru — the AI-powered knowledge base: search, read and manage Cards
 * (individual pieces of verified knowledge), Collections (top-level knowledge
 * bases) and Folders ("Boards" in Guru's UI), over the Guru API v1
 * (`api.getguru.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-05 against Guru's own OpenAPI 3 document — served from
 * ReadMe's API registry at `dash.readme.com/api/v1/api-registry/3gy914ims4w0woi`
 * (411,583 bytes, `info.title` "Guru API", `info.version` "v1"), the uuid read
 * out of `developer.getguru.com`'s own embedded page data — plus live probes
 * against `api.getguru.com` and `status.getguru.com`. Nothing here came from a
 * third-party integration directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The authentication doc's own worked example is stale** (`auth/basic.ts`).
 *     `developer.getguru.com/reference/authentication` tells you to test
 *     credentials against `GET /api/v1/teams`, but that path does not exist
 *     anywhere in the current OpenAPI document and answers a bare 401 for
 *     both no credential and a wrong one — indistinguishable from a typo'd
 *     URL. `GET /api/v1/whoami` is used instead, confirmed to require a
 *     credential and to still exist.
 *  2. **Two credential shapes, one wire format, one of them read-only**
 *     (`auth/basic.ts`). A User token (email as username) is read/write; a
 *     Collection token (Collection ID as username) is GET-only. This app
 *     cannot tell which one it holds in advance — a mutating Action against a
 *     Collection-token Connection surfaces Guru's own 403.
 *  3. **Undocumented `token` fields sit inside ordinary reads**
 *     (`lib/client.ts`). `CollectionModel` — embedded on every Card and
 *     Folder response, and returned directly by the Collection endpoints —
 *     and `TeamUser` (`GET /api/v1/members`) both declare a bare `token`
 *     property with no schema description ruling out that it is a live
 *     Collection API token. Every action here strips it before returning,
 *     the same discipline Apify's `proxy.password` gets elsewhere in this
 *     pack — and no "whoami" Action is offered at all, for the same reason.
 *
 * Guru's newer AI Agent / Knowledge Agent / Chat / Quality subsystem (~80 of
 * the 175 documented paths) is a separate, much larger product surface and is
 * deliberately out of scope for this pass — see README.md.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import cardSearch from "./actions/card-search.ts";
import cardGet from "./actions/card-get.ts";
import cardCreate from "./actions/card-create.ts";
import cardUpdate from "./actions/card-update.ts";
import cardUpdateContent from "./actions/card-update-content.ts";
import cardVerify from "./actions/card-verify.ts";
import cardDelete from "./actions/card-delete.ts";

import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionCreate from "./actions/collection-create.ts";

import folderList from "./actions/folder-list.ts";
import folderGet from "./actions/folder-get.ts";
import folderCreate from "./actions/folder-create.ts";
import folderUpdate from "./actions/folder-update.ts";
import folderItemsList from "./actions/folder-items-list.ts";

import memberList from "./actions/member-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Cards
    cardSearch,
    cardGet,
    cardCreate,
    cardUpdate,
    cardUpdateContent,
    cardVerify,
    cardDelete,
    // Collections
    collectionList,
    collectionGet,
    collectionCreate,
    // Folders ("Boards")
    folderList,
    folderGet,
    folderCreate,
    folderUpdate,
    folderItemsList,
    // Members
    memberList,
  ],
  // Basic auth only — Guru documents no OAuth surface for third-party apps;
  // User/Collection tokens are the whole authentication story.
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;

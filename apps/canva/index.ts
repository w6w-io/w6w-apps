/**
 * Canva — the design platform: create and manage designs, folders, assets,
 * and brand templates over the Canva Connect API (`api.canva.com/rest/v1`).
 *
 * Every path, verb, scope, and request/response field in this app was
 * verified 2026-09-05 against Canva's own live reference documentation at
 * `https://www.canva.dev/docs/connect/` (server-rendered per-endpoint pages,
 * not a generated OpenAPI doc, but no less authoritative — each page is
 * fetched directly, not inferred from a marketing page or a third-party
 * integration directory) plus a live probe of `api.canva.com` and
 * `www.canvastatus.com`. Nothing here came from a sibling app or a guess.
 *
 * The three findings that shaped this design:
 *
 *  1. **Auth is OAuth2 + PKCE, and scopes are refused, not just unused.**
 *     Canva's own guidance: `asset:write` does not imply `asset:read` — a
 *     scope your Connection didn't request is a hard `permission_denied` on
 *     the endpoints that need it, not a silent no-op. See `auth/oauth2.ts`.
 *  2. **Three endpoints are asynchronous, job-based.** Asset upload, design
 *     export, and design autofill all return `{ job: { id, status:
 *     "in_progress" } }` immediately; the actual result only shows up once
 *     a paired `get-*-job` action is polled to `success` or `failed`. This
 *     app models each as a `create-*` + `get-*` action pair rather than
 *     pretending the vendor's API is synchronous.
 *  3. **`GET /v1/users/me` needs no scope at all.** It's the narrowest
 *     possible authenticated probe — reachable no matter which scopes a
 *     Connection actually has — and its response (`user_id`/`team_id` only)
 *     can't leak a working credential the way a design/folder/asset read
 *     might. It's this app's auth `test` hook.
 *
 * Left out, and why (see README.md for the full list): Comments, Analytics,
 * Design imports, Merges, Resizes, and Webhooks. Each would need its own
 * verification pass against live traffic; nothing here was guessed to fill
 * out the surface.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listDesigns from "./actions/list-designs.ts";
import getDesign from "./actions/get-design.ts";
import getDesignPages from "./actions/get-design-pages.ts";
import getDesignExportFormats from "./actions/get-design-export-formats.ts";
import getDesignDataset from "./actions/get-design-dataset.ts";
import createDesign from "./actions/create-design.ts";

import listFolderItems from "./actions/list-folder-items.ts";
import getFolder from "./actions/get-folder.ts";
import createFolder from "./actions/create-folder.ts";
import updateFolder from "./actions/update-folder.ts";
import deleteFolder from "./actions/delete-folder.ts";
import moveFolderItem from "./actions/move-folder-item.ts";

import getAsset from "./actions/get-asset.ts";
import updateAsset from "./actions/update-asset.ts";
import deleteAsset from "./actions/delete-asset.ts";
import createAssetUploadJob from "./actions/create-asset-upload-job.ts";
import getAssetUploadJob from "./actions/get-asset-upload-job.ts";
import createUrlAssetUploadJob from "./actions/create-url-asset-upload-job.ts";
import getUrlAssetUploadJob from "./actions/get-url-asset-upload-job.ts";

import createDesignExportJob from "./actions/create-design-export-job.ts";
import getDesignExportJob from "./actions/get-design-export-job.ts";

import createDesignAutofillJob from "./actions/create-design-autofill-job.ts";
import getDesignAutofillJob from "./actions/get-design-autofill-job.ts";

import listBrandTemplates from "./actions/list-brand-templates.ts";
import getBrandTemplate from "./actions/get-brand-template.ts";
import getBrandTemplateDataset from "./actions/get-brand-template-dataset.ts";

import getCurrentUser from "./actions/get-current-user.ts";
import getUserProfile from "./actions/get-user-profile.ts";
import getUserCapabilities from "./actions/get-user-capabilities.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Designs
    listDesigns,
    getDesign,
    getDesignPages,
    getDesignExportFormats,
    getDesignDataset,
    createDesign,
    // Folders
    listFolderItems,
    getFolder,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolderItem,
    // Assets
    getAsset,
    updateAsset,
    deleteAsset,
    createAssetUploadJob,
    getAssetUploadJob,
    createUrlAssetUploadJob,
    getUrlAssetUploadJob,
    // Exports (async)
    createDesignExportJob,
    getDesignExportJob,
    // Autofill (async)
    createDesignAutofillJob,
    getDesignAutofillJob,
    // Brand templates
    listBrandTemplates,
    getBrandTemplate,
    getBrandTemplateDataset,
    // Users
    getCurrentUser,
    getUserProfile,
    getUserCapabilities,
  ],
  // OAuth2 + PKCE only. Canva publishes no other auth model for third-party
  // integrations.
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

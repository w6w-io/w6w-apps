/**
 * Cognito Forms — the online form builder's REST API (`www.cognitoforms.com/api`).
 *
 * Every path, verb, query parameter, body field, error `Type` and response shape in this app was
 * read off the vendor's own OpenAPI document, `CognitoFormsOpenAPI.json` — the JSON the REST API
 * Reference page (`.../cognito-forms-api/rest-api-reference`) itself loads and renders client-side —
 * fetched and verified live on 2026-08-30. See `lib/client.ts` for the envelope/error details.
 *
 * Covers: listing forms and reading a form's schema; the full create/read/update/delete lifecycle
 * of an entry; the bulk import workflow (upload a file, poll its status); reading a generated entry
 * document or an uploaded file back out; uploading a new file for attachment to an entry; and
 * toggling a form's public-link availability window.
 *
 * Deliberately absent:
 *
 *   - **A "list/query entries" action.** The REST API has none — only Get Entry by a known
 *     `entryId`. Bulk querying entry data is the OData API's job (`CognitoFormsODataAPI`, a separate
 *     spec this app does not implement), so an entry ID here has to come from a webhook, an import
 *     result, or another system that recorded it at submission time.
 *   - **Webhooks.** That is a Trigger, not an Action, and the starter contract this app was built
 *     from does not cover triggers.
 *   - **Form authoring.** Creating, cloning, disabling or deleting forms, and editing their fields,
 *     is a form-designer concern with no REST endpoint in this spec at all — the OpenAPI document
 *     has no `POST /forms` or `PUT /forms/{formId}` operation.
 *   - **A `quota` health check.** Checked live 2026-08-30 against both a success and an error
 *     response: Cognito Forms sets no `X-RateLimit-*`/`RateLimit-*` response header of any kind, so
 *     there is no real number to surface.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import formGetMany from "./actions/form-get-many.ts";
import formGetSchema from "./actions/form-get-schema.ts";
import entryCreate from "./actions/entry-create.ts";
import entryGet from "./actions/entry-get.ts";
import entryUpdate from "./actions/entry-update.ts";
import entryDelete from "./actions/entry-delete.ts";
import entriesImport from "./actions/entries-import.ts";
import importStatusGet from "./actions/import-status-get.ts";
import entryDocumentGet from "./actions/entry-document-get.ts";
import fileUpload from "./actions/file-upload.ts";
import entryFileGet from "./actions/entry-file-get.ts";
import formPublicLinkAvailabilitySet from "./actions/form-public-link-availability-set.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // form
    formGetMany,
    formGetSchema,
    formPublicLinkAvailabilitySet,
    // entry
    entryCreate,
    entryGet,
    entryUpdate,
    entryDelete,
    entriesImport,
    importStatusGet,
    // document / file
    entryDocumentGet,
    fileUpload,
    entryFileGet,
  ],
  auth: [bearerToken],
  healthChecks: [service],
} satisfies AppDefinition;

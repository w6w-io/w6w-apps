/**
 * CompanyCam — photo documentation for contractors: projects, the photos,
 * videos, documents, comments and checklists filed under them, plus the users,
 * groups, tags and webhooks around them, over the Core API v2
 * (`api.companycam.com/v2`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against CompanyCam's own OpenAPI 3.0 document
 * (`github.com/CompanyCam/openapi-spec/openapi.yaml`, 187,449 bytes, md5
 * `37293f27eff6886fbffe4c49e7f4f409`, last commit 2026-08-07) — the same
 * document ReadMe renders at `docs.companycam.com/reference/*` — plus the
 * vendor's guides and changelog, and live probes against `api.companycam.com`
 * and `status.companycam.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The five findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **This API has an end date, and a spell-check hides it** (see the README).
 *     The vendor's own banner reads "These docs are for the legacy API that will
 *     be depreciating early 2027" — *depreciating*, so a grep for `deprecat`
 *     over the whole reference finds nothing. The successor lives behind a login
 *     at `developers.companycam.com`, so nothing about it could be verified and
 *     nothing here is built on it.
 *  2. **An unknown path answers 200, not 404** (`lib/client.ts`). `/v2/<typo>`
 *     redirects to the web sign-in page, which serves 18,795 bytes of HTML with
 *     a `200`. The client rejects a non-JSON success body rather than parsing
 *     the login form as data. The inverse is what makes the auth probe sound: a
 *     JSON `401` proves the path exists.
 *  3. **The impersonation header is spelled two ways** (`lib/client.ts`). The
 *     OpenAPI document says `X-CompanyCam-User`; the guide says
 *     `X_COMPANYCAM_USER`. Those are different headers, the wrong one is
 *     dropped silently by nginx, and the symptom is a photo credited to the
 *     wrong person rather than an error.
 *  4. **Webhook reads return a live secret** (`lib/client.ts`,
 *     `actions/webhook-*.ts`). `Webhook.token` is the HMAC key CompanyCam signs
 *     deliveries with; it is deleted before any action returns, and no probe
 *     goes near that endpoint.
 *  5. **Photos take a hosted URL, documents take base64** (`actions/
 *     project-photo-create.ts`, `actions/project-document-create.ts`). Neither
 *     needs a binary request body, which is what makes this app expressible in
 *     a sandbox that stringifies every body.
 *
 * There is no idempotency key anywhere in this API — no header, no body field,
 * no create-or-update endpoint — so every `perform` here states honestly
 * whether a retry is safe, and the eleven that create something say `false`.
 */
import type { AppDefinition } from "@w6w/types";

import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";
import projectArchive from "./actions/project-archive.ts";
import projectRestore from "./actions/project-restore.ts";
import projectNotepadUpdate from "./actions/project-notepad-update.ts";

import projectPhotoList from "./actions/project-photo-list.ts";
import projectPhotoCreate from "./actions/project-photo-create.ts";
import projectVideoList from "./actions/project-video-list.ts";
import projectAssignedUserList from "./actions/project-assigned-user-list.ts";
import projectUserAssign from "./actions/project-user-assign.ts";
import projectUserRemove from "./actions/project-user-remove.ts";
import projectCollaboratorList from "./actions/project-collaborator-list.ts";
import projectInvitationList from "./actions/project-invitation-list.ts";
import projectInvitationCreate from "./actions/project-invitation-create.ts";
import projectLabelList from "./actions/project-label-list.ts";
import projectLabelAdd from "./actions/project-label-add.ts";
import projectLabelDelete from "./actions/project-label-delete.ts";
import projectDocumentList from "./actions/project-document-list.ts";
import projectDocumentCreate from "./actions/project-document-create.ts";
import projectCommentList from "./actions/project-comment-list.ts";
import projectCommentCreate from "./actions/project-comment-create.ts";
import projectChecklistList from "./actions/project-checklist-list.ts";
import projectChecklistCreate from "./actions/project-checklist-create.ts";
import projectChecklistGet from "./actions/project-checklist-get.ts";

import photoList from "./actions/photo-list.ts";
import photoGet from "./actions/photo-get.ts";
import photoUpdate from "./actions/photo-update.ts";
import photoDelete from "./actions/photo-delete.ts";
import photoTagList from "./actions/photo-tag-list.ts";
import photoTagAdd from "./actions/photo-tag-add.ts";
import photoCommentList from "./actions/photo-comment-list.ts";
import photoCommentCreate from "./actions/photo-comment-create.ts";
import photoDescriptionUpdate from "./actions/photo-description-update.ts";

import videoList from "./actions/video-list.ts";
import videoGet from "./actions/video-get.ts";

import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";

import checklistList from "./actions/checklist-list.ts";
import checklistTemplateList from "./actions/checklist-template-list.ts";

import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupCreate from "./actions/group-create.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCurrentGet from "./actions/user-current-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";

import companyGet from "./actions/company-get.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Projects
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectDelete,
    projectArchive,
    projectRestore,
    projectNotepadUpdate,
    // Everything filed under a project
    projectPhotoList,
    projectPhotoCreate,
    projectVideoList,
    projectAssignedUserList,
    projectUserAssign,
    projectUserRemove,
    projectCollaboratorList,
    projectInvitationList,
    projectInvitationCreate,
    projectLabelList,
    projectLabelAdd,
    projectLabelDelete,
    projectDocumentList,
    projectDocumentCreate,
    projectCommentList,
    projectCommentCreate,
    projectChecklistList,
    projectChecklistCreate,
    projectChecklistGet,
    // Photos
    photoList,
    photoGet,
    photoUpdate,
    photoDelete,
    photoTagList,
    photoTagAdd,
    photoCommentList,
    photoCommentCreate,
    photoDescriptionUpdate,
    // Videos
    videoList,
    videoGet,
    // Tags
    tagList,
    tagGet,
    tagCreate,
    tagUpdate,
    tagDelete,
    // Checklists
    checklistList,
    checklistTemplateList,
    // Groups
    groupList,
    groupGet,
    groupCreate,
    groupUpdate,
    groupDelete,
    // Users
    userList,
    userGet,
    userCurrentGet,
    userCreate,
    userUpdate,
    userDelete,
    // Company
    companyGet,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  // Both credentials CompanyCam documents, and they are interchangeable on the
  // wire: an access token from app.companycam.com and an OAuth access token are
  // both presented as `Authorization: Bearer`. The difference is who they are
  // for — your own account, or other companies' — and that OAuth tokens expire
  // in two hours and carry the read/write/destroy scopes.
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

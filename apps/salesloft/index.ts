/**
 * Salesloft — w6w app for Salesloft's Sales Engagement Platform v2 API.
 *
 * A REST CRM/engagement platform. Every response wraps its payload in a
 * `data` key (list endpoints add `metadata.paging`), and both auth methods
 * sign the same way — `Authorization: Bearer <token>` — against the shared
 * `api.salesloft.com/v2` base; only the token's provenance differs (a
 * customer-issued API key vs an OAuth2 access token for partner
 * integrations).
 *
 * Deliberately absent: the generic `POST /v2/activities` endpoint (it
 * requires an `action_id` or `task_id` sourced from Salesloft's own
 * cadence-step/action machinery, which this app does not otherwise expose,
 * so it could not be wired to anything a workflow could supply); email
 * activity logging (Salesloft syncs these from a connected mailbox rather
 * than accepting an arbitrary create); bulk jobs, imports/exports, and
 * conversation/call-recording endpoints (binary/streaming or async-job
 * surfaces); and CRM-sync configuration (custom fields, CRM activity
 * fields, external ID mapping) — kept out to hold the action set to the
 * operations a sales workflow reaches for most often: people, accounts,
 * cadences, cadence enrollment, calls, notes, tasks and users.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import personCreate from "./actions/person-create.ts";
import personGet from "./actions/person-get.ts";
import personList from "./actions/person-list.ts";
import personUpdate from "./actions/person-update.ts";
import personDelete from "./actions/person-delete.ts";

import accountCreate from "./actions/account-create.ts";
import accountGet from "./actions/account-get.ts";
import accountList from "./actions/account-list.ts";
import accountUpdate from "./actions/account-update.ts";
import accountDelete from "./actions/account-delete.ts";

import cadenceList from "./actions/cadence-list.ts";
import cadenceGet from "./actions/cadence-get.ts";

import cadenceMembershipCreate from "./actions/cadence-membership-create.ts";
import cadenceMembershipList from "./actions/cadence-membership-list.ts";
import cadenceMembershipGet from "./actions/cadence-membership-get.ts";
import cadenceMembershipDelete from "./actions/cadence-membership-delete.ts";

import callCreate from "./actions/call-create.ts";
import callList from "./actions/call-list.ts";

import noteCreate from "./actions/note-create.ts";
import noteList from "./actions/note-list.ts";

import taskCreate from "./actions/task-create.ts";
import taskList from "./actions/task-list.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // person
    personCreate,
    personGet,
    personList,
    personUpdate,
    personDelete,
    // account
    accountCreate,
    accountGet,
    accountList,
    accountUpdate,
    accountDelete,
    // cadence
    cadenceList,
    cadenceGet,
    // cadence membership
    cadenceMembershipCreate,
    cadenceMembershipList,
    cadenceMembershipGet,
    cadenceMembershipDelete,
    // call
    callCreate,
    callList,
    // note
    noteCreate,
    noteList,
    // task
    taskCreate,
    taskList,
    taskUpdate,
    taskDelete,
    // user
    userList,
    userGet,
  ],
  auth: [apiKey, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
